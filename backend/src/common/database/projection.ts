import type { Types } from 'mongoose';

export type Projection<T> = { readonly [K in keyof T]?: 1 };

export type Projected<T, P extends Projection<T>, Id = Types.ObjectId> = Pick<
  T,
  Extract<keyof P, keyof T>
> & {
  _id: Id;
};

export const projection =
  <T>() =>
  <const P extends Projection<T>>(fields: P) =>
    fields;
