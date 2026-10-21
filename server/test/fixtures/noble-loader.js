// Teszt-only ESM loader; a produkciós npm start soha nem használja.
export function resolve(specifier, context, nextResolve) {
  if (specifier === '@stoprocent/noble') {
    return { url: new URL('./noble-stub.js', import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
