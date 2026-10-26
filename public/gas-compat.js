(() => {
  const mutationNames = new Set(['batchSaveScores','updateRemark','deleteUnit','saveUnit','autoGenerateAssignments','addAssignment','updateAssignment','deleteAssignment','saveAttendance','addStudent','updateStudent','deleteStudent','saveThemeToConfig']);

  async function requestJson(url, options = {}) {
    const init = { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } };
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(body.message || body.error || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); error.body = body; throw error; }
    return body;
  }

  async function call(name, args) {
    if (name === 'getInitialData') return requestJson('/api/initial-data');
    if (name === 'loginStudent') return requestJson('/api/auth/student', { method: 'POST', body: JSON.stringify({ studentId: args[0] }) });
    if (name === 'verifyTeacherPasswordFromSheet') {
      try { const result = await requestJson('/api/auth/teacher', { method: 'POST', body: JSON.stringify({ password: args[0] }) }); return !!result.success; }
      catch (error) { if (error.body && error.body.success === false) return false; throw error; }
    }
    if (name === 'logout') return requestJson('/api/auth/logout', { method: 'POST', body: '{}' });
    if (mutationNames.has(name)) {
      const csrf = await requestJson('/api/auth/csrf');
      const headers = { 'x-csrf-token': csrf.token };
      if (name === 'batchSaveScores') return requestJson('/api/scores/batch', { method: 'POST', headers, body: JSON.stringify(args[0]) });
      if (name === 'updateRemark') return requestJson('/api/remarks', { method: 'POST', headers, body: JSON.stringify(args[0]) });
      if (name === 'saveUnit') return requestJson('/api/units', { method: 'POST', headers, body: JSON.stringify(args[0]) });
      if (name === 'saveAttendance') return requestJson('/api/attendance', { method: 'POST', headers, body: JSON.stringify(args[0]) });
      if (name === 'addStudent') return requestJson('/api/students', { method: 'POST', headers, body: JSON.stringify(args[0]) });
      if (name === 'updateStudent') return requestJson('/api/students', { method: 'PUT', headers, body: JSON.stringify(args[0]) });
      if (name === 'saveThemeToConfig') return requestJson('/api/theme', { method: 'POST', headers, body: JSON.stringify({ theme: args[0] }) });
      if (name === 'addAssignment') return requestJson('/api/assignments', { method: 'POST', headers, body: JSON.stringify(args[0]) });
      if (name === 'updateAssignment') return requestJson('/api/assignments', { method: 'PUT', headers, body: JSON.stringify(args[0]) });
      if (name === 'deleteAssignment') return requestJson(`/api/assignments/${encodeURIComponent(args[0])}/${encodeURIComponent(args[1])}/${encodeURIComponent(args[2])}`, { method: 'DELETE', headers });
      if (name === 'deleteUnit') return requestJson(`/api/units/${encodeURIComponent(args[0])}/${encodeURIComponent(args[1])}`, { method: 'DELETE', headers });
      if (name === 'deleteStudent') return requestJson(`/api/students/${encodeURIComponent(args[0])}`, { method: 'DELETE', headers });
      if (name === 'autoGenerateAssignments') return requestJson(`/api/subjects/${encodeURIComponent(args[0])}/auto-generate-assignments`, { method: 'POST', headers, body: '{}' });
    }
    throw new Error('ไม่รู้จัก API: ' + name);
  }

  function runner(promise) {
    const chain = { withSuccessHandler(fn) { promise.then(fn); return chain; }, withFailureHandler(fn) { promise.catch(fn); return chain; } };
    return chain;
  }
  function deferredChain(success, failure) {
    return new Proxy({}, { get(_, name) {
      if (name === 'withSuccessHandler') return (fn) => deferredChain(fn, failure);
      if (name === 'withFailureHandler') return (fn) => deferredChain(success, fn);
      return (...args) => { const promise = call(name, args); if (success) promise.then(success); if (failure) promise.catch(failure); return runner(promise); };
    }});
  }

  window.gasApi = new Proxy({}, { get(_, name) {
    if (name === 'withSuccessHandler') return (fn) => deferredChain(fn, null);
    if (name === 'withFailureHandler') return (fn) => deferredChain(null, fn);
    return (...args) => runner(call(name, args));
  }});
})();
