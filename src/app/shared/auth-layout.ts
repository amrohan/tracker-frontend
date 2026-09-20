import { Component, input } from "@angular/core";

@Component({
  selector: "app-auth-layout",
  template: `
    <div class="wrap">
      <aside class="brand" aria-hidden="true">
        <div class="logo">▤</div>
        <h1>Tracker</h1>
        <p>Track anything.<br />Remember everything.</p>
        <div class="orbs"><span></span><span></span><span></span></div>
      </aside>
      <main class="panel">
        <div class="card">
          <h2>{{ heading() }}</h2>
          <p class="muted sub">{{ subheading() }}</p>
          <ng-content />
        </div>
      </main>
    </div>
  `,
  styles: `
    .wrap {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    }
    .brand {
      position: relative;
      overflow: hidden;
      padding: 56px;
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: linear-gradient(140deg, #06424a, #0e7c86 55%, #22b8c5);
    }
    .logo {
      font-size: 44px;
      opacity: 0.9;
    }
    .brand h1 {
      font-size: 3.4rem;
      margin: 8px 0;
      letter-spacing: -0.02em;
    }
    .brand p {
      font-size: 1.3rem;
      opacity: 0.9;
      line-height: 1.4;
    }
    .orbs span {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
    }
    .orbs span:nth-child(1) {
      width: 320px;
      height: 320px;
      right: -90px;
      bottom: -80px;
    }
    .orbs span:nth-child(2) {
      width: 160px;
      height: 160px;
      right: 120px;
      bottom: 140px;
      background: rgba(255, 179, 71, 0.25);
    }
    .orbs span:nth-child(3) {
      width: 90px;
      height: 90px;
      left: 40px;
      top: 50px;
    }
    .panel {
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(420px, 100%);
    }
    h2 {
      font-size: 2rem;
    }
    .sub {
      margin: 4px 0 24px;
    }
    @media (max-width: 800px) {
      .wrap {
        grid-template-columns: 1fr;
      }
      .brand {
        display: none;
      }
    }
  `,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly subheading = input("");
}
