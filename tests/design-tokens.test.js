import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssPath = path.resolve(__dirname, '../src/index.css');

test('MarsNova CSS contains exact required color tokens', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify specified colors from project rules
  const requiredColors = [
    '#030912', // Background Deep
    '#080F1D', // Surface Card
    '#101B2B', // Muted Border
    '#7919F5', // Purple Primary
    '#A855F7', // Purple Glow
    '#38BDF8', // Cyan Accent
    '#F5F7FF'  // White Heading Text
  ];

  for (const color of requiredColors) {
    assert.ok(
      css.toLowerCase().includes(color.toLowerCase()),
      `CSS should contain required color token: ${color}`
    );
  }
});

test('MarsNova CSS defines accessible focus-visible styles', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes(':focus-visible'), 'CSS must define :focus-visible rules for accessibility');
  assert.ok(css.includes('outline: 2px solid var(--cyan-accent)'), 'Focus ring must use cyan accent');
});

test('MarsNova CSS defines keyframe animations for loading spinner and skeleton', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('@keyframes spin'), 'CSS must define @keyframes spin');
  assert.ok(css.includes('@keyframes skeletonPulse'), 'CSS must define skeleton pulse');
});
