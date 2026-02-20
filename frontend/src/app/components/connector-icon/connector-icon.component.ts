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
          <svg class="connector-svg" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <ellipse cx="15" cy="32" rx="4" ry="3.5" fill="none" stroke="currentColor" stroke-width="2"/>
            <ellipse cx="15" cy="24" rx="3" ry="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M8 8 L22 8 Q24 12 22 16 L8 16 Q6 12 8 8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        }
        @case ('type2') {
          <svg class="connector-svg" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="15" cy="28" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="15" cy="18" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <rect x="10" y="4" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        }
        @case ('chademo') {
          <svg class="connector-svg" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <ellipse cx="15" cy="30" rx="6" ry="5" fill="none" stroke="currentColor" stroke-width="2"/>
            <ellipse cx="15" cy="20" rx="4" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M12 6 L18 6 L18 14 L12 14 Z" fill="none" stroke="currentColor" stroke-width="2"/>
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
