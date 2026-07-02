/**
 * Parsea el texto crudo de la trama que llega desde el indicador (todo lo que
 * va entre STX y CR) y devuelve el peso en kg como número entero.
 * Devuelve 0 si el valor no es válido o es negativo.
 */
export function parseScaleWeight(raw: string, trama: string): number {
  let parsedStr: string;

  switch (trama) {
    // ── Tramas con texto crudo de longitud fija ──────────────────────────────
    case 'Cardinal SMA':
      parsedStr = raw.slice(1, -3).substring(5).replace(/\s+/g, '');
      break;

    case 'Rice Lake IQ355':
      parsedStr = raw.slice(1, -3).substring(1).replace(/\s+/g, '');
      break;

    case 'Cardinal SB-200':
      parsedStr = raw.slice(1, -10).substring(1).replace(/\s+/g, '');
      break;

    case 'AND':
      parsedStr = raw.slice(1, -2).substring(3).replace(/\s+/g, '');
      break;

    case 'Cardinal SB-400':
      parsedStr = raw.slice(1, -8).substring(1).replace(/\s+/g, '');
      break;

    case 'WI110':
      parsedStr = raw.slice(1, -2).substring(3).replace(/\s+/g, '');
      break;

    case 'Toledo Long/Short':
      parsedStr = raw.slice(1, -6).substring(4).replace(/\s+/g, '');
      break;

    case 'SB500 con Semáforo':
      parsedStr = raw.slice(1, -4).substring(1).replace(/\s+/g, '');
      break;

    // ── Trama Numero ─────────────────────────────────────────────────────────
    // Formato emulado: T1({canal})  {codigo}  {peso}
    // Extrae el número que aparece después del patrón ")" + código + espacios.
    case 'Numero': {
      const m = raw.match(/\)\s*[\d:]+\s+(-?\d+(?:\.\d+)?)/);
      parsedStr = m ? m[1] : raw.replace(/[^\d.-]/g, '');
      break;
    }

    // ── Bavaria Tibitoc ──────────────────────────────────────────────────────
    // Formato: i{canal:02}{valor1:6}{valor2:6}
    // Ejemplo con peso 12345: "i00 12345     0"
    //   - i       : 1 char  (identificador)
    //   - canal   : 2 chars (00-99)
    //   - valor1  : 6 chars (peso, alineado a la derecha)
    //   - valor2  : 6 chars (campo secundario)
    case 'Bavaria Tibitoc': {
      const v = Number(raw.substring(3, 9).trim());
      return Number.isNaN(v) || v < 0 ? 0 : Math.floor(v / 10);
    }

    default:
      parsedStr = '0';
  }

  const value = Number(parsedStr);
  if (Number.isNaN(value) || value < 0) return 0;
  return value;
}
