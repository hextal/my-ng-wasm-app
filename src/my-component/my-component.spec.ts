import '../test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyComponent } from './my-component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    // Override external template/styles to avoid resource resolution
    TestBed.overrideComponent(MyComponent, {
      set: {
        template: `<canvas #canvas></canvas><input type="file" #fileInput />`,
        styles: []
      }
    });

    await TestBed.configureTestingModule({
      imports: [MyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
