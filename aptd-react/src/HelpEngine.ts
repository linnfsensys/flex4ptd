/**
 * Interface for help balloon data
 */
export interface HelpBalloon {
  id: string;
  text: string;
  position: { x: number; y: number };
  target?: string;
}

/**
 * Interface for help highlight data
 */
export interface Hilight {
  id: string;
  target: string;
  type: string;
}

/**
 * HelpEngine - Manages help balloons and highlights for the application
 */
export default class HelpEngine {
  private enabled: boolean = false;
  private helpBalloons: HelpBalloon[] = [];
  private helpHiLights: Hilight[] = [];

  constructor() {
    // Initialize with empty help data
  }

  /**
   * Enable or disable the help system
   */
  public setHelpEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if help is enabled
   */
  public isHelpEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get all help balloons
   */
  public getHelpBalloons(): HelpBalloon[] {
    return this.enabled ? this.helpBalloons : [];
  }

  /**
   * Get all help highlights
   */
  public getHelpHiLights(): Hilight[] {
    return this.enabled ? this.helpHiLights : [];
  }

  /**
   * Add a help balloon
   */
  public addHelpBalloon(balloon: HelpBalloon): void {
    this.helpBalloons.push(balloon);
  }

  /**
   * Add a help highlight
   */
  public addHelpHiLight(hilight: Hilight): void {
    this.helpHiLights.push(hilight);
  }

  /**
   * Clear all help data
   */
  public clearHelp(): void {
    this.helpBalloons = [];
    this.helpHiLights = [];
  }
} 