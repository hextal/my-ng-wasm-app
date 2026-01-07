import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have default message', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    expect(component.message).toBe('Load an image to start editing');
  });

  it('should have default button text', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    expect(component.buttonText).toBe('Load image');
  });

  it('should have default icon path', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    expect(component.iconPath).toBe('/assets/icons/image-icon.svg');
  });

  it('should accept custom message input', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    component.message = 'Custom message';
    expect(component.message).toBe('Custom message');
  });

  it('should accept custom button text input', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    component.buttonText = 'Custom button';
    expect(component.buttonText).toBe('Custom button');
  });

  it('should accept custom icon path input', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    component.iconPath = '/custom/path.svg';
    expect(component.iconPath).toBe('/custom/path.svg');
  });

  it('should emit action event when button is clicked', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    let emitted = false;

    component.action.subscribe(() => {
      emitted = true;
    });

    component.handleAction();

    expect(emitted).toBe(true);
  });

  it('should render message in template', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    const messageElement = compiled.querySelector('.empty-state__text');
    
    expect(messageElement?.textContent).toContain('Load an image to start editing');
  });

  it('should render button text in template', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    const buttonElement = compiled.querySelector('.empty-state__button');
    
    expect(buttonElement?.textContent?.trim()).toBe('Load image');
  });

  it('should render icon with correct src', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    const iconElement = compiled.querySelector('.empty-state__icon') as HTMLImageElement;
    
    expect(iconElement?.src).toContain('/assets/icons/image-icon.svg');
  });

  it('should call handleAction when button is clicked in template', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    
    const handleActionSpy = vi.spyOn(component, 'handleAction');
    
    const compiled = fixture.nativeElement as HTMLElement;
    const buttonElement = compiled.querySelector('.empty-state__button') as HTMLButtonElement;
    buttonElement?.click();
    
    expect(handleActionSpy).toHaveBeenCalled();
  });
});
