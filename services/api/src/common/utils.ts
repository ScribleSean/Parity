import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class DecimalUtil {
  static toNumber(value: Prisma.Decimal | number): number {
    return typeof value === 'number' ? value : value.toNumber();
  }
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

export function generateUsername(base: string): string {
  const clean = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 12) || 'trader';
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${clean}${suffix}`.slice(0, 20);
}
