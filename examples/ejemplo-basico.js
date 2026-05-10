/**
 * ejemplo-basico.js
 * Uso de reactive-store-js en Node.js
 *
 * Ejecutar: node examples/ejemplo-basico.js
 */

const { createStore } = require('../src/store');

console.log('─── reactive-store-js · Ejemplo básico ───\n');

// 1. Crear el store
const store = createStore({
  user: {
    name: 'Ana García',
    role: 'developer',
  },
  notifications: 0,
  theme: 'dark',
});

// 2. Suscribirse a cambios
const unsubscribeName = store.subscribe('user.name', (newVal, oldVal) => {
  console.log(`[user.name] ${oldVal} → ${newVal}`);
});

store.subscribe('notifications', (newVal) => {
  console.log(`[notifications] Nueva cuenta: ${newVal}`);
});

store.subscribe('*', (newVal, oldVal, path) => {
  console.log(`[wildcard] Cambio en "${path}"`);
});

// 3. Computed property
const welcomeMessage = store.compute('welcomeMessage', (s) =>
  `Bienvenida, ${s.user.name} (${s.user.role})`
);

console.log('Mensaje inicial:', welcomeMessage());

// 4. Modificar el estado → los subscribers se disparan automáticamente
console.log('\n--- Cambios de estado ---');
store.state.user.name   = 'Lucía Martínez';
store.state.notifications = 5;
store.state.theme       = 'light';

console.log('\nMensaje actualizado:', welcomeMessage());

// 5. Cancelar una suscripción
console.log('\n--- Cancelando suscripción a user.name ---');
unsubscribeName();
store.state.user.name = 'Carmen López'; // no dispara el subscriber cancelado

// 6. Undo / Redo
console.log('\n--- Undo / Redo ---');
console.log('notifications antes del undo:', store.state.notifications);
store.undo();
console.log('notifications después del undo:', store.state.notifications);
store.redo();
console.log('notifications después del redo:', store.state.notifications);

// 7. Snapshot y Reset
console.log('\n--- Snapshot y Reset ---');
const snap = store.snapshot();
console.log('Snapshot del estado actual:', JSON.stringify(snap, null, 2));
store.reset();
console.log('Tras reset — notifications:', store.state.notifications);

// 8. DevTools
console.log('\n--- DevTools ---');
console.log(store.devtools());
