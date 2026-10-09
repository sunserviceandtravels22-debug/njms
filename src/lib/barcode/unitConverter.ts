import { Unit } from './types';
import { UNIT_FACTORS } from './constants';

export const convertToPx = (value: number, unit: Unit, dpi: number = 72): number => {
  if (unit === Unit.PX) return value;
  
  // Convert unit value to inches first
  const valueInInches = value / UNIT_FACTORS[unit];
  
  // Convert inches to pixels based on target DPI
  return Math.round(valueInInches * dpi);
};

export const convertUnit = (value: number, fromUnit: Unit, toUnit: Unit): number => {
  if (fromUnit === toUnit) return value;
  const inches = value / UNIT_FACTORS[fromUnit];
  return inches * UNIT_FACTORS[toUnit];
};
