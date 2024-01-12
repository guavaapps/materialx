export class Ids {
    private static MASK = 1000
    private ids: string[] = []
    private generated: number[] = []

    add (id: string) {
        this.ids.push(id)
    }

    generate () {
        const generated: number[] = []

        const idCount = this.ids.length

        for (let i = 0; i < idCount; i ++) {
            generated.push(i + Ids.MASK)
        }

        this.generated = generated

        return generated
    }

    get (id: string) {
        const i = this.ids.indexOf(id)
        return this.generated[i]
    }

    getId (id: number) {
        const index = id - Ids.MASK

        return this.ids[index]
    }
}