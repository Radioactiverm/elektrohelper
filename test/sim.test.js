import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOTORS, fitMotor, evaluate } from '../public/js/sim/motor.js';
import { MPCB, MCB } from '../public/js/sim/protection.js';

test('náhradní schéma motoru odpovídá štítku', () => {
  for (const preset of MOTORS) {
    const p = fitMotor(preset);
    const op = evaluate(p, p.spec.sn);
    assert.ok(Math.abs(op.I - preset.In) / preset.In < 0.15, `${preset.id} kW: I ${op.I.toFixed(2)} A vs In ${preset.In} A`);
  }
});

test('tepelná spoušť: delší čas při menším přetížení', () => {
  const t = (x) => {
    const p = new MPCB({ range: [6.3, 10], Ir: 8, cls: 10 });
    let s = 0;
    while (s < 3600) {
      s += 0.01;
      if (p.update(0.01, [8 * x, 8 * x, 8 * x])) return s;
    }
    return Infinity;
  };
  const t15 = t(1.5);
  const t72 = t(7.2);
  assert.ok(t72 >= 4 && t72 <= 10, `třída 10 při 7,2×Ir: ${t72.toFixed(1)} s`);
  assert.ok(t15 > t72 * 5);
  assert.equal(t(1.0), Infinity);
});

test('jistič C16 vybaví zkrat okamžitě', () => {
  const b = new MCB({ char: 'C', In: 16 });
  let ev = null;
  for (let i = 0; i < 5 && !ev; i++) ev = b.update(0.005, [16 * 12, 0, 0]);
  assert.equal(ev?.kind, 'mag');
});
