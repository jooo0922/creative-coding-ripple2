'use strict';

import {
  distance
} from './utils.js';

export class Ripple {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.maxRadius = 0;
    this.speed = 10;
  }

  // 얘는 app.js에서 정의한 브라우저의 width, height값을 가와서
  // getMax() 메소드에서 브라우저 끝의 네 개의 꼭지점 좌표값을 구하는 데 쓰려고 정의한 메소드.
  resize(stageWidth, stageHeight) {
    this.stageWidth = stageWidth;
    this.stageHeight = stageHeight;
  }

  start(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;

    // 임의의 (x, y)좌표점으로부터 네 개의 꼭지점까지의 거리값 중에서 가장 멀리 떨어진 거리값을
    // this.maxRadius 즉, 최대 반지름값으로 정해줌.
    this.maxRadius = this.getMax(x, y);
  }

  animate(ctx) {
    if (this.radius < this.maxRadius) {
      // 이 최대 반지름값과 반지름이 같아질 때까지 애니메이션 프레임마다 매번 반지름을 10씩 늘려줌.
      // 왜 가장 멀리 떨어진 거리값을 최대 반지름값으로 정한걸까?
      // 그 반지름으로 그린 원이라면 화면을 꽉채우고도 넘치는 원을 만들테니까.
      // 즉, ripple이 화면을 꽉 채우고 넘칠때까지 커지도록 할려고 가장 멀리 떨어진 거리값을 최대 반지름값으로 정한거임.
      this.radius += this.speed;
    }

    // 사실 얘내는 ripple이 어떻게 퍼진다는 걸 보여줄때만 필요한 거고
    // 클릭한 곳을 중심으로 dot을 채워나가려면 this.ripple.radius값과 프레임마다의 this.ripple.radius의 
    // 변화값만 알면 되기 때문에 굳이 프레임마다 ripple 원을 그려줄 필요가 없음.
    // ctx.beginPath();
    // ctx.fillStyle = '#00ff00'; // ripple이 어떤 흐름으로 커지는지 테스트용으로 보여주려고 눈에 띄는 형광색으로 일단 넣어준거.
    // ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false); // start angle 를 따로 안넣어줘도 0을 기본값으로 인식해서 arc를 그리는 것 같음.
    // ctx.fill();
  }

  getMax(x, y) {
    const c1 = distance(0, 0, x, y);
    const c2 = distance(this.stageWidth, 0, x, y);
    const c3 = distance(0, this.stageHeight, x, y);
    const c4 = distance(this.stageWidth, this.stageHeight, x, y);
    // 브라우저의 네 꼭지점 끝에서 임의의 좌표 (x, y)까지의 거리를 각각 구한 다음
    // 거리값이 가장 큰 값. 즉 가장 멀리 떨어져있는 거리값을 return해줌.
    return Math.max(c1, c2, c3, c4); // Math.max()함수는 입력값으로 받은 0개 이상의 숫자 중 가장 큰 숫자를 반환함.
  }
}