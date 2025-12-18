import '../test-setup';
import { describe, it, expect } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('should create the app component class', () => {
    const app = new App();
    expect(app).toBeTruthy();
  });

  it('should be defined', () => {
    expect(App).toBeDefined();
  });
});
