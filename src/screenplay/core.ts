/**
 * Minimal hand-rolled screenplay core for Lane B (design doc §4: the API lane does not
 * drag in browser tooling). Tasks are imperative verb phrases, Questions noun phrases
 * (docs/naming-conventions.md); step definitions stay one line thick.
 */

// Abilities are plain classes; the map is keyed by constructor.
export type Ability = object;
export type AbilityCtor<A extends Ability> = abstract new (...args: never[]) => A;

export interface Task {
  performAs(actor: Actor): Promise<void>;
}

export interface Question<T> {
  answeredBy(actor: Actor): Promise<T>;
}

export class Actor {
  private readonly abilities = new Map<Function, Ability>();
  private readonly notes = new Map<string, unknown>();

  constructor(public readonly name: string) {}

  whoCan(...abilities: Ability[]): this {
    for (const ability of abilities) {
      this.abilities.set(ability.constructor, ability);
    }
    return this;
  }

  abilityTo<A extends Ability>(ctor: AbilityCtor<A>): A {
    const ability = this.abilities.get(ctor);
    if (!ability) {
      throw new Error(`${this.name} does not have the ability ${ctor.name}`);
    }
    return ability as A;
  }

  async attemptsTo(...tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await task.performAs(this);
    }
  }

  asks<T>(question: Question<T>): Promise<T> {
    return question.answeredBy(this);
  }

  /** Scenario-scoped memory for ids captured from responses (test-data policy §5.8). */
  remember(key: string, value: unknown): void {
    this.notes.set(key, value);
  }

  recall<T>(key: string): T {
    if (!this.notes.has(key)) {
      throw new Error(`${this.name} has no note named '${key}'`);
    }
    return this.notes.get(key) as T;
  }
}
