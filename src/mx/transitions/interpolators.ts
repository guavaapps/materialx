export type Interpolator = (progress: number, args?: any) => number
export const LinearInterpolator: Interpolator = (progress: number) => progress