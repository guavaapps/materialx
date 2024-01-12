export class Pools {
    private static readonly DEBUG = false

    private constructor() {
    }
}

export namespace Pools {
    export interface Pool<T> {
        acquire (): T | null

        release (instance: T): boolean

        releaseAll(variables: T[], count: number): void
    }

    export class SimplePool<T> implements Pool <T> {
        private mPool: (T | null)[] = []

        private mPoolSize: number = 0

        constructor (maxPoolSize: number) {
            if (maxPoolSize <= 0) {
                throw new Error ("max pool size must be > 0")
            }

            this.mPool = new Array<T | null> (maxPoolSize).fill(null)
        }

        acquire(): T | null {
            if (this.mPoolSize > 0) {
                const lastPooledIndex = this.mPoolSize - 1
                let instance: T = this.mPool[lastPooledIndex] as T
                this.mPool[lastPooledIndex] = null
                this.mPoolSize --

                return instance
            }

            return null
        }

        release(instance: T): boolean {
            if (this.mPoolSize < this.mPool.length) {
                this.mPool[this.mPoolSize] = instance as T
                this.mPoolSize ++

                return true
            }

            return false
        }

        releaseAll(variables: T[], count: number): void {
            if (count > variables.length) {
                count = variables.length
            }
            for (let i = 0; i < count; i++) {
                let instance: T = variables[i]
                if (this.mPoolSize < this.mPool.length) {
                    this.mPool[this.mPoolSize] = instance as T
                    this.mPoolSize ++;
                }
            }
        }
    }
}