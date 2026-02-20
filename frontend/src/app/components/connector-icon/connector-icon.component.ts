import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Показва иконка за тип конектор (CCS, Type 2, CHAdeMO) в стил щепсел.
 */
@Component({
  selector: 'app-connector-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="connector-icon-wrap" [title]="type">
      @switch (iconType) {
        @case ('ccs') {
          <svg class="connector-svg connector-svg-ccs" viewBox="0 0 744.09 1052.36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4">
              <ellipse cx="425.65" cy="446.21" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="318.45" cy="446.21" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="268" cy="357.93" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="372.05" cy="357.93" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="474.52" cy="357.93" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="424.86" cy="286.2" rx="24.44" ry="25.23" stroke-width="23"/>
              <ellipse cx="322.39" cy="286.2" rx="24.44" ry="25.23" stroke-width="23"/>
              <path stroke-width="40" stroke-linejoin="round" d="m 266.42,212.1 214.4,0 c 0,0 22.48,15.2 31.95,25.65 9.47,10.45 18.49,24.49 24.8,35.84 6.31,11.35 11.42,21.51 15.76,34.68 4.35,13.17 8.33,26.9 9.46,44.14 1.12,17.24 -0.51,40.83 -4.73,58.33 -4.22,17.5 -12.06,33.42 -18.92,45.72 -6.86,12.3 -11.89,18.53 -20.49,28.38 -8.61,9.85 -19.92,20.96 -31.53,29.95 -11.61,8.99 -23.82,17.22 -37.84,23.65 -14.01,6.42 -45.72,14.19 -45.72,14.19 0,0 -42.93,5.76 -77.25,-6.31 -13.64,-4.8 -22.58,-6.43 -37.84,-14.19 -19.11,-9.72 -37.52,-22.04 -52.02,-37.84 -19.93,-21.71 -35.9,-47.88 -45.72,-75.67 -7.77,-22 -10.32,-46.04 -9.46,-69.36 0.65,-17.72 4.79,-35.43 11.04,-52.02 5.3,-14.09 14.3,-27.65 22.07,-39.41 7.61,-11.51 21,-24.12 29.95,-31.53 8.95,-7.41 22.07,-14.19 22.07,-14.19 z"/>
              <ellipse cx="285.34" cy="676.37" rx="52.59" ry="53.38" stroke-width="23"/>
              <ellipse cx="457.18" cy="674.8" rx="52.59" ry="53.38" stroke-width="23"/>
              <rect x="176.79" y="581.22" width="388.94" height="191.88" rx="95.94" stroke-width="30.45" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="m 291.65,560.5 160.8,1.58" stroke-width="23"/>
            </g>
          </svg>
        }
        @case ('type2') {
          <svg class="connector-svg connector-svg-type2" viewBox="0 0 744.09 1052.36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4">
              <ellipse cx="422.49" cy="566.03" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="315.29" cy="566.03" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="264.85" cy="477.74" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="368.89" cy="477.74" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="471.36" cy="477.74" rx="33.48" ry="32.69" stroke-width="23"/>
              <ellipse cx="421.71" cy="406.02" rx="24.44" ry="25.23" stroke-width="23"/>
              <ellipse cx="319.24" cy="406.02" rx="24.44" ry="25.23" stroke-width="23"/>
              <path stroke-width="40" stroke-linejoin="round" d="m 263.27,331.92 214.4,0 c 0,0 22.48,15.2 31.95,25.65 9.47,10.45 18.49,24.49 24.8,35.84 6.31,11.35 11.42,21.51 15.76,34.68 4.35,13.17 8.33,26.9 9.46,44.14 1.12,17.24 -0.51,40.83 -4.73,58.33 -4.22,17.5 -12.06,33.42 -18.92,45.72 -6.86,12.3 -11.89,18.53 -20.49,28.38 -8.61,9.85 -19.92,20.96 -31.53,29.95 -11.61,8.99 -23.82,17.22 -37.84,23.65 -14.01,6.42 -45.72,14.19 -45.72,14.19 0,0 -42.93,5.76 -77.25,-6.31 -13.64,-4.8 -22.58,-6.43 -37.84,-14.19 -19.11,-9.72 -37.52,-22.04 -52.02,-37.84 -19.93,-21.71 -35.9,-47.88 -45.72,-75.67 -7.77,-22 -10.32,-46.04 -9.46,-69.36 0.65,-17.72 4.79,-35.43 11.04,-52.02 5.3,-14.09 14.3,-27.65 22.07,-39.41 7.61,-11.51 21,-24.12 29.95,-31.53 8.95,-7.41 22.07,-14.19 22.07,-14.19 z"/>
            </g>
          </svg>
        }
        @case ('chademo') {
          <svg class="connector-svg connector-svg-chademo" viewBox="0 0 744 1052" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4">
              <ellipse cx="512.14" cy="506.65" rx="69.1" ry="72.68" stroke-width="65"/>
              <ellipse cx="233.57" cy="506.65" rx="69.1" ry="72.68" stroke-width="65"/>
              <circle cx="371.43" cy="330.93" r="70" stroke-width="10"/>
              <ellipse cx="319.86" cy="330.93" rx="16.38" ry="17.09" stroke-width="7.3"/>
              <ellipse cx="421.57" cy="330.93" rx="16.38" ry="17.09" stroke-width="7.3"/>
              <ellipse cx="372.14" cy="380.36" rx="16.38" ry="17.09" stroke-width="7.3"/>
              <ellipse cx="372.14" cy="276.65" rx="16.38" ry="17.09" stroke-width="7.3"/>
              <circle cx="371.43" cy="680.93" r="70" stroke-width="10"/>
              <ellipse cx="319.86" cy="680.93" rx="16.38" ry="17.09" stroke-width="7.3"/>
              <ellipse cx="421.57" cy="680.93" rx="16.38" ry="17.09" stroke-width="7.3"/>
              <ellipse cx="372.14" cy="730.36" rx="16.38" ry="17.09" stroke-width="7.3"/>
              <ellipse cx="372.14" cy="626.65" rx="16.38" ry="17.09" stroke-width="7.3"/>
              <path stroke-width="18" d="m 198.57,253.79 c 0,0 52.59,-29.4 81.07,-38.57 27.98,-9.01 57.39,-15.38 86.79,-15.71 33.62,-0.38 67.56,5.66 99.64,15.71 28.15,8.82 79.64,38.57 79.64,38.57 l 38.57,-8.57 54.29,54.29 -11.43,40 c 0,0 31.19,55.84 39.29,86.43 7.4,27.97 9.04,57.52 7.86,86.43 -1.36,33.32 -6.01,67.14 -17.14,98.57 -9.47,26.72 -24.36,51.64 -41.43,74.29 -16.82,22.32 -37.2,42.12 -59.14,59.43 -18.22,14.38 -38.26,26.77 -59.43,36.29 -21.57,9.69 -44.67,16.05 -67.86,20.71 -18.16,3.65 -36.76,5.4 -55.29,5.57 -18.28,0.17 -36.66,-1.25 -54.64,-4.5 -18.53,-3.35 -36.85,-8.43 -54.36,-15.36 -19.7,-7.8 -38.76,-17.59 -56.43,-29.29 C 184.88,742.4 161.99,724.8 142.86,703.79 123.47,682.5 106.54,658.42 94.29,632.36 82.99,608.36 76.46,582.1 72.14,555.93 c -4.31,-26.1 -5.93,-52.94 -3.57,-79.29 2.39,-26.75 9.29,-53.12 17.86,-78.57 7.17,-21.31 27.86,-61.43 27.86,-61.43 l -9.43,-41.71 49.43,-49.71 z"/>
            </g>
          </svg>
        }
        @default {
          <svg class="connector-svg" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="15" cy="28" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="15" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <rect x="11" y="4" width="8" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        }
      }
    </span>
  `,
  styles: [`
    .connector-icon-wrap {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }
    .connector-svg {
      width: 28px;
      height: 36px;
      color: #374151;
    }
    .connector-svg-ccs,
    .connector-svg-type2,
    .connector-svg-chademo {
      width: 28px;
      height: 36px;
    }
  `],
})
export class ConnectorIconComponent {
  /** Тип конектор: CCS, Type 2, CHAdeMO и др. */
  @Input() type = '';

  get iconType(): string {
    const t = (this.type || '').toLowerCase();
    if (t.includes('ccs') || t.includes('combo')) return 'ccs';
    if (t.includes('type 2') || t.includes('type2') || t.includes('mennekes')) return 'type2';
    if (t.includes('chademo')) return 'chademo';
    return 'default';
  }
}
