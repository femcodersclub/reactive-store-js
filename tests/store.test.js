/**
 * Tests — reactive-store-js
 * Usa el módulo assert nativo de Node.js. Sin dependencias externas.
 *
 * Ejecutar: node tests/store.test.js
 */

const assert = require('assert');
const { createStore } = require('../src/store');

// --- Utilidad para tests ---

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${description}`);
    console.error(`     → ${err.message}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// ─────────────────────────────────────────────
// SECCIÓN 1: Estado básico
// ─────────────────────────────────────────────

section('1. Estado básico');

test('Crea un store con estado inicial', () => {
  const store = createStore({ count: 0, name: 'FemCoders' });
  assert.strictEqual(store.state.count, 0);
  assert.strictEqual(store.state.name, 'FemCoders');
});

test('Permite leer propiedades anidadas', () => {
  const store = createStore({ user: { profile: { name: 'Ana' } } });
  assert.strictEqual(store.state.user.profile.name, 'Ana');
});

test('Permite modificar el estado directamente', () => {
  const store = createStore({ count: 0 });
  store.state.count = 5;
  assert.strictEqual(store.state.count, 5);
});

test('Permite modificar propiedades anidadas', () => {
  const store = createStore({ user: { name: 'Ana', age: 30 } });
  store.state.user.name = 'Lucía';
  assert.strictEqual(store.state.user.name, 'Lucía');
  assert.strictEqual(store.state.user.age, 30); // el resto no cambia
});

// ─────────────────────────────────────────────
// SECCIÓN 2: Suscripciones
// ─────────────────────────────────────────────

section('2. Suscripciones');

test('Notifica al subscriber cuando cambia una clave', () => {
  const store = createStore({ count: 0 });
  let received = null;
  store.subscribe('count', (newVal) => { received = newVal; });
  store.state.count = 42;
  assert.strictEqual(received, 42);
});

test('Pasa el valor anterior al callback', () => {
  const store = createStore({ count: 10 });
  let oldReceived = null;
  store.subscribe('count', (newVal, oldVal) => { oldReceived = oldVal; });
  store.state.count = 20;
  assert.strictEqual(oldReceived, 10);
});

test('No notifica si el valor no cambia', () => {
  const store = createStore({ count: 5 });
  let callCount = 0;
  store.subscribe('count', () => { callCount++; });
  store.state.count = 5; // mismo valor
  assert.strictEqual(callCount, 0);
});

test('Suscripción a propiedad anidada con notación de puntos', () => {
  const store = createStore({ user: { name: 'Ana' } });
  let received = null;
  store.subscribe('user.name', (newVal) => { received = newVal; });
  store.state.user.name = 'Lucía';
  assert.strictEqual(received, 'Lucía');
});

test('Suscripción wildcard (*) recibe cualquier cambio', () => {
  const store = createStore({ a: 1, b: 2 });
  const changes = [];
  store.subscribe('*', (newVal, oldVal, path) => { changes.push(path); });
  store.state.a = 10;
  store.state.b = 20;
  assert.strictEqual(changes.length, 2);
  assert.ok(changes.includes('a'));
  assert.ok(changes.includes('b'));
});

test('La función de limpieza cancela la suscripción', () => {
  const store = createStore({ count: 0 });
  let callCount = 0;
  const unsubscribe = store.subscribe('count', () => { callCount++; });
  store.state.count = 1;
  unsubscribe();
  store.state.count = 2;
  assert.strictEqual(callCount, 1); // solo la primera vez
});

test('Múltiples subscribers en la misma clave', () => {
  const store = createStore({ value: 0 });
  let a = 0, b = 0;
  store.subscribe('value', () => { a++; });
  store.subscribe('value', () => { b++; });
  store.state.value = 1;
  assert.strictEqual(a, 1);
  assert.strictEqual(b, 1);
});

// ─────────────────────────────────────────────
// SECCIÓN 3: Computed properties
// ─────────────────────────────────────────────

section('3. Computed properties');

test('Computed property devuelve valor derivado del estado', () => {
  const store = createStore({ price: 100, tax: 0.21 });
  const totalPrice = store.compute('totalPrice', (s) => s.price * (1 + s.tax));
  assert.strictEqual(totalPrice(), 121);
});

test('Computed property se actualiza cuando cambia el estado', () => {
  const store = createStore({ members: 1200, active: 0.8 });
  const activeMembers = store.compute('activeMembers', (s) =>
    Math.round(s.members * s.active)
  );
  store.state.members = 1300;
  assert.strictEqual(activeMembers(), 1040);
});

// ─────────────────────────────────────────────
// SECCIÓN 4: Historial (undo / redo)
// ─────────────────────────────────────────────

section('4. Historial — undo / redo');

test('Undo revierte el último cambio', () => {
  const store = createStore({ count: 0 });
  store.state.count = 1;
  store.state.count = 2;
  store.undo();
  assert.strictEqual(store.state.count, 1);
});

test('Redo rehace el cambio deshecho', () => {
  const store = createStore({ count: 0 });
  store.state.count = 5;
  store.undo();
  store.redo();
  assert.strictEqual(store.state.count, 5);
});

test('Undo devuelve false cuando no hay historial', () => {
  const store = createStore({ count: 0 });
  const result = store.undo();
  assert.strictEqual(result, false);
});

test('Redo devuelve false cuando no hay estados futuros', () => {
  const store = createStore({ count: 0 });
  store.state.count = 1;
  const result = store.redo();
  assert.strictEqual(result, false);
});

test('Un cambio nuevo limpia el futuro (redo no disponible)', () => {
  const store = createStore({ count: 0 });
  store.state.count = 1;
  store.state.count = 2;
  store.undo();
  store.state.count = 99; // nuevo cambio
  const result = store.redo();
  assert.strictEqual(result, false);
});

// ─────────────────────────────────────────────
// SECCIÓN 5: Snapshot y reset
// ─────────────────────────────────────────────

section('5. Snapshot y reset');

test('Snapshot devuelve una copia inmutable del estado', () => {
  const store = createStore({ count: 10 });
  const snap = store.snapshot();
  snap.count = 999; // mutar la copia no afecta al store
  assert.strictEqual(store.state.count, 10);
});

test('Reset vuelve al estado inicial', () => {
  const store = createStore({ count: 0, name: 'FemCoders' });
  store.state.count = 50;
  store.state.name = 'Cambiado';
  store.reset();
  assert.strictEqual(store.state.count, 0);
  assert.strictEqual(store.state.name, 'FemCoders');
});

// ─────────────────────────────────────────────
// SECCIÓN 6: DevTools
// ─────────────────────────────────────────────

section('6. DevTools');

test('DevTools devuelve el estado actual del store', () => {
  const store = createStore({ members: 1300 });
  const info = store.devtools();
  assert.strictEqual(info.state.members, 1300);
});

test('DevTools refleja el número de subscribers activos', () => {
  const store = createStore({ count: 0 });
  store.subscribe('count', () => {});
  store.subscribe('count', () => {});
  const info = store.devtools();
  assert.strictEqual(info.subscribers['count'], 2);
});

test('DevTools lista las computed properties registradas', () => {
  const store = createStore({ x: 1 });
  store.compute('double', (s) => s.x * 2);
  const info = store.devtools();
  assert.ok(info.computed.includes('double'));
});

// ─────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────

console.log('\n─────────────────────────────────────────');
console.log(`Resultado: ${passed} passed · ${failed} failed`);
console.log('─────────────────────────────────────────\n');

if (failed > 0) process.exit(1);
