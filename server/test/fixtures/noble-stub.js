// Csak a gyermekfolyamatos tesztekhez: nincs valódi adapter vagy natív binding.
import { EventEmitter } from 'node:events';

export function withBindings() {
  const noble = new EventEmitter();
  noble.state = 'poweredOn';
  noble.stop = () => {};
  return noble;
}
