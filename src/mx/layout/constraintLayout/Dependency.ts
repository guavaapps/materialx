import {DependencyNode} from "./DependencyNode";

export interface Dependency {
    update (node: Dependency): void
}