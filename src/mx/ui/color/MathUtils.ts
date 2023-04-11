
export class MathUtils {
    static lerp(start: number, stop: number, amount: number): number {
        return (1.0 - amount) * start + amount * stop
    }

    static sanitizeDegrees(degrees: number) {
        if (degrees < 0) {
            return degrees % 360.0 + 360
        } else if (degrees >= 360.0) {
            return degrees % 360.0
        } else {
            return degrees
        }
    }
}