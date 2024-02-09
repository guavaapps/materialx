import React, {useEffect, useState} from "react";
import add from "../../add.svg";
import {AttributeSet} from "../styles/Style";

export function Vector(params: Vector.Params) {
    const [vector, setVector] = useState(<svg/>)

    useEffect(() => {
        const getVector = () => fetch(add)
            .then((response) => {
                response.text().then((v) => {
                    const parser = new DOMParser()
                    const vector = parser.parseFromString(v, "image/svg+xml").documentElement

                    console.log("vector", vector.attributes[0])

                    const vectorObject: AttributeSet = {}

                    const vectorPartNames: string[] = []
                    const vectorPartObjects: AttributeSet[] = []

                    const count = vector.attributes.length
                    for (let i = 0; i < count; i++) {
                        const name = vector.attributes[i].name
                        const value = vector.attributes[i].nodeValue

                        vectorObject[name] = value
                    }

                    const partsCount = vector.children.length

                    for (let i = 0; i < partsCount; i++) {
                        const child = vector.children[i]
                        let childObject: AttributeSet = {}

                        const aCount = child.attributes.length
                        for (let j = 0; j < aCount; j++) {
                            const name = child.attributes[j].name
                            const value = child.attributes[j].nodeValue

                            childObject[name] = value
                        }

                        vectorPartNames.push(child.tagName)
                        vectorPartObjects.push(childObject)
                    }

                    console.log("names", vectorPartNames)
                    console.log("parts", vectorPartObjects)

                    const svgParts = vectorPartObjects
                        .map((it, i) => React.createElement(
                            vectorPartNames[i],
                            vectorPartObjects[i]
                        ))
                    const svgElement = React.createElement("svg", vectorObject, ...svgParts)

                    console.log("svg", svgElement)

                    setVector(svgElement)
                })
            })

        getVector()
    }, [])


    // <img width={24} height={24} src={params.src}/>
    return (
        vector
    )
}

export namespace Vector {
    export type Params = {
        src: string,
    }
}