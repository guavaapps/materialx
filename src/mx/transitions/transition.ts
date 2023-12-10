import {Interpolator, LinearInterpolator} from "./interpolators";
import {OrbNumberTransition, OrbObjectTransition, OrbTransition} from "../../orb/orb";
import {ServiceStateUpdateHandler} from "../app/app";
import {transition} from "../components/orb";

export abstract class Transition {
    abstract steps: any[]
    abstract duration: number
    delay?: number = 0
    repeat?: number = 1
    direction?: "forward" | "reverse" | "alternate" = "forward"
    persistOnEnd?: boolean = false
    persistOnCancel?: boolean = false
    interpolator?: Interpolator
}

const TAG = "mx-transition-object-id"

export class TransitionObject {
    transition: Transition;
    transitionWrapper: TransitionWrapper
    animationId?: number
    callback: AnimationCallback

    // transition states
    progress = 0
    isStarted = false
    isRunning = false
    isEnded = false
    isCancelled = false

    constructor(transitionId: string, transition: Transition, transitionWrapper: TransitionWrapper, callback: AnimationCallback) {
        this.transition = transition;
        this.callback = callback
        this.transitionWrapper = transitionWrapper
    }
}

export interface TransitionWrapper {
    at(progress: number): any

    buildAll(count: number): any[]
}

export interface AnimationCallback {
    onStart?(): void

    onProgressChanged?(progress: number): void

    onResume?(): void

    onPause?(): void

    onCancel?(): void

    onEnd?(): void
}

type TransitionHandlerCall = (transitionId: string) => any
type TransitionHandlerCallSet = {
    play: TransitionHandlerCall,
    pause: TransitionHandlerCall,
    cancel: TransitionHandlerCall,
    end: TransitionHandlerCall,
    getProgress: TransitionHandlerCall,
    getElapsedTime: TransitionHandlerCall,
    getState: TransitionHandlerCall
}

export class Animation {
    private transitionHandler: TransitionHandler
    private transitionId: string

    private callSet: TransitionHandlerCallSet

    get progress() {
        return this.callSet.getProgress(this.transitionId)
    }

    get elapsedTime() {
        return this.callSet.getElapsedTime(this.transitionId)
    }

    get currentState() {
        return this.callSet.getState(this.transitionId)
    }

    private playAnimation
    private pauseAnimation
    private cancelAnimation
    private endAnimation

    constructor(
        transitionHandler: TransitionHandler, transitionId: string, callSet: TransitionHandlerCallSet
    ) {
        this.transitionHandler = transitionHandler
        this.transitionId = transitionId

        this.callSet = callSet

        this.playAnimation = callSet.play
        this.pauseAnimation = callSet.pause
        this.cancelAnimation = callSet.cancel
        this.endAnimation = callSet.end
    }

    play() {
        // this.transitionHandler.playAnimation(this.transitionId)
        this.playAnimation(this.transitionId)
    }

    pause() {
        // this.transitionHandler.pauseAnimation(this.transitionId)
        this.pauseAnimation(this.transitionId)
    }

    cancel() {
        // this.transitionHandler.cancelAnimation(this.transitionId)
        this.cancelAnimation(this.transitionId)
    }

    end() {
        // this.transitionHandler.endAnimation(this.transitionId)
        this.endAnimation(this.transitionId)
    }
}

export class TransitionHandler {
    private runningTransitions: { [transitionId: string]: TransitionObject } = {}

    private getProgress(transitionId: string) {
        const transitionObject = this.runningTransitions[transitionId]

        return transitionObject.progress
    }

    private getElapsedTime(transitionId: string) {
        const transitionObject = this.runningTransitions[transitionId]

        const progress = this.getProgress(transitionId)
        const duration = transitionObject.transition.duration

        return progress * duration
    }

    private getState(transitionId: string) {
        const transitionObject = this.runningTransitions[transitionId]

        return transitionObject.transitionWrapper.at(this.getProgress(transitionId))
    }

    animate(transition: Transition, callback: AnimationCallback) {
        const transitionId = this.createTransitionObject(transition, callback)

        const animation = new Animation(this, transitionId, {
            play: transitionId => this.playAnimation(transitionId),
            pause: transitionId => this.pauseAnimation(transitionId),
            cancel: transitionId => this.cancelAnimation(transitionId),
            end: transitionId => this.endAnimation(transitionId),
            getProgress: transitionId => this.getProgress(transitionId),
            getElapsedTime: transitionId => this.getElapsedTime(transitionId),
            getState: transitionId => this.getState(transitionId)
        })

        // this.runningAnimations[transitionId] = animation

        return animation//this.runningAnimations[transitionId]
    }

    private resolveTransition(transition: Transition) {
        // TODO add support for other transition types
        if (typeof transition.steps[0] === "number") {
            return new OrbNumberTransition(transition.steps, transition.interpolator)
        }

        return new OrbObjectTransition(transition.steps, transition.interpolator)
    }

    private createTransitionObject(transition: Transition, callback: AnimationCallback) {
        const transitionId = this.createTransitionId()
        const transitionWrapper = this.resolveTransition(transition)
        const transitionObject = new TransitionObject(transitionId, transition, transitionWrapper, callback)
        this.runningTransitions[transitionId] = transitionObject

        return transitionId
    }

    private startAnimation(transitionId: string, runOnce = false) {
        const transitionObject = this.runningTransitions[transitionId]
        const transition = transitionObject.transition

        let startTime = 0

        let runtime = 0
        let progress = transitionObject.progress

        let count = 0

        if (!transitionObject.isStarted) {
            transitionObject.isStarted = true
        }
        transitionObject.isRunning = true
        transitionObject.isCancelled = false
        transitionObject.isEnded = false

        function step(timestamp: number) {
            if (!startTime) startTime = timestamp

            runtime = timestamp - startTime

            progress = runtime / transition.duration

            transitionObject.progress = progress

            transitionObject.callback.onProgressChanged?.(progress)

            if (progress < 1 && transitionObject.isRunning && !runOnce) {
                window.requestAnimationFrame(step)
            } else {
                window.cancelAnimationFrame(transitionObject.animationId!)
            }
        }

        const animationId = window.requestAnimationFrame(step)
        transitionObject.animationId = animationId

    }

    private stopAnimation(transitionId: string) {
        const transitionObject = this.runningTransitions[transitionId]
        const animationId = transitionObject.animationId!

        transitionObject.isRunning = false

        window.cancelAnimationFrame(animationId)


    }

    private playAnimation(transitionId: string) {
        this.startAnimation(transitionId)

        const transitionObject = this.runningTransitions[transitionId]

        transitionObject.callback.onResume?.()

    }

    private pauseAnimation(transitionId: string) {
        const transitionObject = this.runningTransitions[transitionId]


        this.stopAnimation(transitionId)


        console.log("TH>>PAUSE", "pausing with", transitionObject.progress)

        transitionObject.callback.onPause?.()

    }

    private cancelAnimation(transitionId: string) {
        this.stopAnimation(transitionId)

        const transitionObject = this.runningTransitions[transitionId]

        transitionObject.isStarted = false
        transitionObject.isCancelled = true

        if (!transitionObject.transition.persistOnCancel) {
            transitionObject.progress = 0
            this.startAnimation(transitionId, true)
        }

        transitionObject.callback.onCancel?.()

    }

    private endAnimation(transitionId: string) {
        this.stopAnimation(transitionId)

        const transitionObject = this.runningTransitions[transitionId]

        transitionObject.isStarted = false
        transitionObject.isEnded = true

        transitionObject.callback.onEnd?.()

    }

    private createTransitionId() {
        const runningIds = Object.keys(this.runningTransitions)

        let id = ""

        do {
            id = new Date().getTime().toString()
        } while (runningIds.includes(id))

        return id
    }
}