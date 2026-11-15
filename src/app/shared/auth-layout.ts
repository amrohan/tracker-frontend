import { Component, input } from "@angular/core";

@Component({
  selector: "app-auth-layout",
  template: `
    <div class="auth-wrap">
      <aside class="auth-brand" aria-hidden="true">
        <div class="brand-inner">
          <div class="brand-logo-icon">▤</div>
          <h1 class="brand-headline">Tracker</h1>
          <p class="brand-tagline">
            Track anything.<br />
            Remember everything.
          </p>
          <div class="brand-features">
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>Completely custom data collections</span>
            </div>
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>Fast search, filters & summaries</span>
            </div>
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>Works offline as an installable PWA</span>
            </div>
          </div>
        </div>
        <div class="ambient-glow glow-1"></div>
        <div class="ambient-glow glow-2"></div>
      </aside>

      <main class="auth-panel">
        <div class="auth-card">
          <div class="mobile-logo sm:hidden">
            <span class="logo-box">▤</span>
            <span class="logo-text">Tracker</span>
          </div>

          <h2 class="auth-heading">{{ heading() }}</h2>
          @if (subheading()) {
            <p class="auth-subheading">{{ subheading() }}</p>
          }

          <div class="auth-content">
            <ng-content />
          </div>
        </div>
      </main>
    </div>
  `,
  styles: `
    .auth-wrap {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
      background: var(--app-surface);
    }

    .auth-brand {
      position: relative;
      overflow: hidden;
      padding: clamp(40px, 6vw, 80px);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: linear-gradient(145deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
      border-right: 1px solid var(--app-outline);
    }

    .brand-inner {
      position: relative;
      z-index: 10;
      max-width: 440px;
    }

    .brand-logo-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      background: var(--app-primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      margin-bottom: 24px;
    }

    .brand-headline {
      font-size: 2.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin: 0 0 12px;
      line-height: 1.15;
    }

    .brand-tagline {
      font-size: 1.15rem;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1.5;
      margin: 0 0 36px;
    }

    .brand-features {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 500;
    }

    .feature-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--app-primary);
      flex-shrink: 0;
    }

    .ambient-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      opacity: 0.25;
    }

    .glow-1 {
      width: 400px;
      height: 400px;
      right: -100px;
      bottom: -100px;
      background: var(--app-primary);
    }

    .glow-2 {
      width: 250px;
      height: 250px;
      left: -40px;
      top: 10%;
      background: #8b5cf6;
    }

    .auth-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(24px, 5vw, 48px);
      background: var(--app-surface-container);
    }

    .auth-card {
      width: min(420px, 100%);
      background: var(--app-surface);
      border: 1px solid var(--app-outline);
      border-radius: var(--radius-xl);
      padding: clamp(24px, 5vw, 36px);
      box-shadow: var(--app-shadow-lg);
    }

    .mobile-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }

    .logo-box {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      background: var(--app-primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }

    .logo-text {
      font-weight: 700;
      font-size: 1.15rem;
      color: var(--app-text);
      letter-spacing: -0.02em;
    }

    .auth-heading {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--app-text);
      margin: 0 0 6px;
    }

    .auth-subheading {
      font-size: 0.875rem;
      color: var(--app-text-muted);
      margin: 0 0 24px;
      line-height: 1.45;
    }

    .auth-content {
      width: 100%;
    }

    @media (max-width: 860px) {
      .auth-wrap {
        grid-template-columns: 1fr;
      }
      .auth-brand {
        display: none;
      }
      .auth-panel {
        padding: 24px 16px;
      }
      .auth-card {
        box-shadow: none;
        border: none;
        background: transparent;
        padding: 16px 8px;
      }
    }
  `,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly subheading = input("");
}
