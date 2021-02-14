'use strict';

export function distance(x1, y1, x2, y2) {
  // x, y는 (x2, y2)좌표와 (x1, y1) 좌표 사이의 거리인 것 같음.
  const x = x2 - x1;
  const y = y2 - y1;

  // Math.sqrt() 함수는 숫자의 제곱근을 반환함. (Square Root의 약자)
  // 좌표들 사이의 x, y거리값의 제곱을 더한 값의 제곱근을 구해서 return? 뭔가 수학공식 같은데?

  // 맞아. 직각삼각형의 빗변의 길이를 구하는 공식을 적용한거임. 여기서 좌표들 사이의 x, y거리값은 각각
  // 직각삼각형으로 치면 각각 '밑변'과 '높이'에 해당함.
  // 직각삼각형에서 (밑변² + 높이²)의 제곱근 = 빗변의 길이임. 

  // 여기서 직각삼각형의 빗변의 길이는 갑자기 왜 구하는걸까?
  // ripple.js의 getMax() 메소드에서 c1, c2, c3, c4에서 호출하는 distance의 파라미터들은
  // x, y라는 캔버스 상의 임의의 좌표지점. 그리고 브라우저의 네 개의 끝에 있는 꼭지점 좌표를 가리킴.
  // 이 네 개의 꼭지점과 좌표지점 사이의 거리를 구하려는 거임!
  // 이 거리가 직각삼각형으로 치면 빗변의 길이와 같기 때문에 빗변의 길이를 구하려고 했던거임. 
  return Math.sqrt(x * x + y * y);
}

/**
 * app.js 의 animate() 메소드에서 
 * collide(dot.x, dot.y, this.ripple.x, this.ripple.y, this.ripple.radius) 이렇게 전달해줄거임.
 * 
 * 그럼 어떻게 되겠어? 
 * 내가 클릭한 ripple의 중심점 좌표와 app.js에 있는 dots 배열안에 담긴 각각의 dot들 사이의
 * 거리값을 가져와서, 그게 현재 프레임의 this.ripple.radius값보다 작다면, true를 return하고 아니면 false를 return하겠지
 * 
 * 즉, 현재 프레임에 그려진 ripple의 범위 안에 중심좌표값이 위치한 dot들에 대해서만 true를 return하라는 뜻!
 */
export function collide(x1, y1, x2, y2, radius) {
  if (distance(x1, y1, x2, y2) <= radius) {
    return true;
  } else {
    return false;
  }
}

// 이 함수는 중심점에 위치한 픽셀의 rgb값으로 명도값을 계산하여 return하도록 만든 것임.
export function getBWValue(red, green, blue, isReversed) {
  const detect = 2;
  if (!isReversed) {
    // isReversed = false일 때에 if block을 실행해주라는 것.
    // Math.floor() 함수는 주어진 숫자와 같거나 작은 정수 중에서 가장 큰 수를 반환함.
    return 255 - Math.floor((red + green + blue) / detect);
    // rgb 값의 개념상, (red + green + blue)의 값이 765(255 + 255 + 255)에 가까울수록 명도가 높은 색(밝은 색)일 것이고
    // (red + green + blue)의 값이 0(0 + 0 + 0)에 가까울수록 명도가 낮은 색(어두운 색)일 것이다.
    // 그렇다면, 255 - Math.floor((red + green + blue) / detect);의 값은
    // 해당 픽셀의 명도가 밝을수록 -127에 가까울 것임.
    // 명도가 어두울수록 255에 가까울 거임.
    // 따라서, 결과적으로 isReversed = false라면 getBWValue는 255(어두운 명도) ~ -127(밝은 명도) 사이의 값을 return해줄 것임.
  } else {
    // isReversed = true일 때에는 else block을 실행해주라는 것.
    // 여기는 if block과 반대로
    // isReversed = true라면 getBWValue는 0(어두운 명도) ~ 382(밝은 명도) 사이의 값을 return해줄 것임.
    return Math.floor((red + green + blue) / detect);
  }
}
/**
 * 여기서 의문점, 왜 굳이 detect = 2로 할당해서 나눠준 것일까?
 * red, green, blue 각각 최댓값이 255이고, 얘내들을 모두 더한 뒤 평균값으로 명도값을 표현하고 싶은 거라면,
 * 255 - Math.floor((red + green + blue) / 3) 또는 Math.floor((red + green + blue) / 3)을 해줘야
 * 0 ~ 255 사이의 값으로 명도를 표현하는 게 원래의 의도 아니였을까?
 * 
 * 하지만 명도를 0 ~ 255로 표현해 버리면, app.js의 drawDots()메소드 안에서 
 * dot.targetRadius > 0.1 조건문에 의해 탈락하는 dot들이 거의 없어지게 된다.
 * 그로 인해 거의 모든 dot이 dots 배열안에 push되고, 거의 모든 dot이 캔버스상에 그려져서 점묘화가 그려짐.
 * 또 dot간의 크기 차이가 별로 안나게 되기도 함.
 * 그래도 상관은 없으나, 모든 부분에 dot이 찍히면 완전 밝게 표현되어야 하는 부분에도 dot이 찍혀버리고,
 * 어두운 부분과 밝은 부분의 dot들의 크기 차이가 별로 안나게 되면서
 * 점묘화에서 밝은 부분과 어두운 부분의 명도 대비가 덜 일어남.
 * 
 * detect값, 즉 나누는 값이 작아질수록 app.js에서의 scale값, 즉 명도값의 범위가 더 늘어나게 된다.
 * 그렇게 되면 targetRadius가 0.1이 안되는 애들은 탈락해버리고, 명도에 따른 dot의 크기차이가 확 나면서
 * 점묘화의 명도 대비가 확실하게 나게 된다.
 * 
 * 결론적으로, 표현상의 이점으로 인해, 명도 대비를 확실하게 주기 위해 detect값을 3이 아니라 2로 준 것 같다.
 */