/**
 * reactive-store-js
 * Sistema de estado reactivo usando Proxy nativo de JavaScript
 * Sin dependencias externas. Vanilla JS puro.
 */

/**
 * Crea un store reactivo a partir de un estado inicial.
 * Devuelve el estado envuelto en un Proxy + la API pública del store.
 *
 * @param {Object} initialState - Estado inicial del store
 * @returns {{ state: Proxy, subscribe, unsubscribe, compute, undo, redo, getHistory, snapshot, reset }}
 */
function createStore(initialState = {}) {
  // --- Estado interno ---
  const subscribers = new Map();   // clave → Set de callbacks
  const computed = new Map();      // nombre → función derivada
  const history = [];              // historial de snapshots
  const future = [];               // estados futuros (para redo)
  const MAX_HISTORY = 50;

  let state = deepClone(initialState);
  let isRecording = true;          // pausa la grabación durante undo/redo

  // --- Utilidades ---

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Obtiene un valor anidado usando notación de puntos.
   * Ejemplo: getByPath(state, 'user.profile.name')
   */
  function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  /**
   * Establece un valor anidado usando notación de puntos.
   * Ejemplo: setByPath(obj, 'user.profile.name', 'Ana')
   */
  function setByPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((acc, key) => {
      if (acc[key] === undefined || acc[key] === null) acc[key] = {};
      return acc[key];
    }, obj);
    target[last] = value;
  }

  /**
   * Notifica a todos los subscribers de una clave concreta.
   * También notifica a los wildcards ('*') y a prefijos parciales.
   */
  function notify(path, newValue, oldValue) {
    // Notifica la clave exacta
    if (subscribers.has(path)) {
      subscribers.get(path).forEach(cb => cb(newValue, oldValue, path));
    }

    // Notifica prefijos padre (si suscrito a 'user' y cambia 'user.name')
    const parts = path.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('.');
      if (subscribers.has(parentPath)) {
        const parentValue = getByPath(state, parentPath);
        subscribers.get(parentPath).forEach(cb => cb(parentValue, undefined, path));
      }
    }

    // Notifica wildcard global
    if (subscribers.has('*')) {
      subscribers.get('*').forEach(cb => cb(newValue, oldValue, path));
    }

    // Recalcula computed properties afectadas
    computed.forEach((fn, name) => {
      const result = fn(proxyState);
      if (subscribers.has(name)) {
        subscribers.get(name).forEach(cb => cb(result, undefined, name));
      }
    });
  }

  /**
   * Guarda un snapshot del estado en el historial.
   */
  function saveSnapshot() {
    if (!isRecording) return;
    history.push(deepClone(state));
    if (history.length > MAX_HISTORY) history.shift();
    future.length = 0; // limpiar el futuro al hacer un cambio nuevo
  }

  // --- Proxy handler ---

  function createProxy(target, basePath = '') {
    return new Proxy(target, {
      get(obj, key) {
        if (typeof key === 'symbol') return obj[key];
        const fullPath = basePath ? `${basePath}.${key}` : key;
        const value = obj[key];
        // Si el valor es un objeto, devolvemos un Proxy anidado
        if (value !== null && typeof value === 'object') {
          return createProxy(value, fullPath);
        }
        return value;
      },

      set(obj, key, value) {
        const fullPath = basePath ? `${basePath}.${key}` : key;
        const oldValue = obj[key];

        // Evita notificaciones innecesarias si el valor no cambia
        if (JSON.stringify(oldValue) === JSON.stringify(value)) return true;

        saveSnapshot();
        obj[key] = value;
        notify(fullPath, value, oldValue);
        return true;
      },

      deleteProperty(obj, key) {
        const fullPath = basePath ? `${basePath}.${key}` : key;
        const oldValue = obj[key];
        saveSnapshot();
        delete obj[key];
        notify(fullPath, undefined, oldValue);
        return true;
      }
    });
  }

  const proxyState = createProxy(state);

  // --- API pública ---

  /**
   * Suscribe un callback a cambios en una clave concreta.
   * Usa notación de puntos para rutas anidadas: 'user.profile.name'
   * Usa '*' para suscribirse a cualquier cambio.
   *
   * @param {string} path - Ruta a observar
   * @param {Function} callback - fn(newValue, oldValue, path)
   * @returns {Function} - Función para cancelar la suscripción
   */
  function subscribe(path, callback) {
    if (!subscribers.has(path)) {
      subscribers.set(path, new Set());
    }
    subscribers.get(path).add(callback);

    // Devuelve una función de limpieza (unsubscribe)
    return () => unsubscribe(path, callback);
  }

  /**
   * Cancela una suscripción específica.
   */
  function unsubscribe(path, callback) {
    if (subscribers.has(path)) {
      subscribers.get(path).delete(callback);
    }
  }

  /**
   * Registra una propiedad computada (valor derivado del estado).
   * Los subscribers pueden suscribirse a ella por nombre.
   *
   * @param {string} name - Nombre de la computed property
   * @param {Function} fn - fn(state) → valor derivado
   * @returns {Function} - Getter de la computed property
   */
  function compute(name, fn) {
    computed.set(name, fn);
    // Devuelve un getter inmediato
    return () => fn(proxyState);
  }

  /**
   * Deshace el último cambio de estado.
   * @returns {boolean} - true si se pudo deshacer
   */
  function undo() {
    if (history.length === 0) return false;
    future.push(deepClone(state));
    const previous = history.pop();
    isRecording = false;
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, previous);
    isRecording = true;
    // Notifica cambio global
    if (subscribers.has('*')) {
      subscribers.get('*').forEach(cb => cb(state, undefined, 'undo'));
    }
    return true;
  }

  /**
   * Rehace el último cambio deshecho.
   * @returns {boolean} - true si se pudo rehacer
   */
  function redo() {
    if (future.length === 0) return false;
    history.push(deepClone(state));
    const next = future.pop();
    isRecording = false;
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, next);
    isRecording = true;
    if (subscribers.has('*')) {
      subscribers.get('*').forEach(cb => cb(state, undefined, 'redo'));
    }
    return true;
  }

  /**
   * Devuelve una copia del historial de estados.
   */
  function getHistory() {
    return history.map(deepClone);
  }

  /**
   * Devuelve un snapshot inmutable del estado actual.
   */
  function snapshot() {
    return deepClone(state);
  }

  /**
   * Resetea el estado al estado inicial.
   */
  function reset() {
    saveSnapshot();
    isRecording = false;
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, deepClone(initialState));
    isRecording = true;
    if (subscribers.has('*')) {
      subscribers.get('*').forEach(cb => cb(state, undefined, 'reset'));
    }
  }

  /**
   * DevTools: devuelve el estado interno del store para debugging.
   */
  function devtools() {
    return {
      state: snapshot(),
      subscribers: Object.fromEntries(
        [...subscribers.entries()].map(([k, v]) => [k, v.size])
      ),
      computed: [...computed.keys()],
      historySize: history.length,
      futureSize: future.length,
    };
  }

  return {
    state: proxyState,
    subscribe,
    unsubscribe,
    compute,
    undo,
    redo,
    getHistory,
    snapshot,
    reset,
    devtools,
  };
}

// Exporta para Node.js y para uso directo en browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createStore };
}
