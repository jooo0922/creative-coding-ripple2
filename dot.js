const PI2 = Math.PI * 2; // 360도를 라디안값으로 작성. 원을 만들겠군
const BOUNCE = 0.82 // radius가 진동하기 위한 인수

export class Dot {
  constructor(x, y, radius, pixelSize, red, green, blue, scale) {
    this.x = x;
    this.y = y;
    const ratio = radius / 256 / 2;
    // ratio = 16 / 256/ 2 = 0.03125임.
    /**
     * 왜 굳이 2로 한 번 더 나눠준 것일까?
     * 
     * 내 생각에는 일단 처음에는 scale값의 범위를 0 ~ 255로 받으려고 했을 것이고, 그렇게 되면
     * scale값이 총 256개가 될테니까, 주어진 radius값도 scale의 갯수에 맞춰서 
     * 곱해주는 단위값으로써 ratio를 radius / 256을 해준 것 같다.
     * 밑에서 targetRadius를 계산할 때 ratio * scale하니까 scale값에 비례하는 targetRadius를 구하려고 했겠지.
     * 
     * 그런데 막상 scale값의 범위는 너무 좁으니까 detect값을 3 -> 2로 줄여서 범위를 더 넓혀서
     * 점묘화의 명도 대비를 확실하게 주려고 했던 거 같고,
     * 
     * 여기서 막상 radius / 256 한 값으로 targetRadius를 계산해주다 보니 그 값들이 전체적으로 좀 컸던 것 같음.
     * 그래서 막상 저 값으로 dot을 캔버스에 그리면 dot이 전체적으로 커서 크기가 큰 dot들이 서로 뭉쳐보이는 느낌이 듦.
     * 그래서 targetRadius의 크기를 좀 작게 해줘야 할 거 같으니 2로 한 번 더 나눠준 거 같다.
     */

    this.targetRadius = ratio * scale
    // targetRadius 값을 255 ~ -127(scale값의 범위)사이의 값에 0.03125를 곱하겠지? 
    // 그러면 targetRadius의 범위는 7.96875(어두운 명도) ~ -3.96875(밝은 명도) 사이의 값으로 할당받게 됨.
    // 결국, dot의 중심점에 위치한 픽셀의 명도가 어두울수록 해당 dot의 targetRadius가 커짐.
    // 즉, 명도가 어두울수록 크기가 큰 dot이 캔버스에 그려질거임.

    this.radius = 0; // 얘는 this.radius로 파라미터로 전달받는 radius랑 다름.
    this.radiusV = 0; // radius가 증가하는 속도
    this.pixelSize = pixelSize;
    this.pixelSizeHalf = pixelSize / 2;
    this.red = red;
    this.green = green;
    this.blue = blue;
  }

  animate(ctx) {
    /*
    ctx.beginPath();
    ctx.fillStyle = '#000';
    ctx.fillRect(
      this.x - this.pixelSizeHalf,
      this.y - this.pixelSizeHalf,
      this.pixelSize, this.pixelSize
    );
    // 이렇게 하면 x, y좌표점을 중심점으로 하는 this.pixelSize * this.pixelSize 크기의 검은색 정사각형이 만들어지겠지?
    // 이 검은 정사각형이 뭐냐면 dot 하나가 들어갈 일종의 자리? 프레임? 경계선 박스? 를 마련해놓은 거라고 보면 됨.
    
    지금 ripple2에서는 검은색 경계선 박스가 필요없음. 
    why? 일단 배경을 white로 깔고 검정색 dot만 넣어줘서 해당 dot의 중심점에 위치한 픽셀의 명도만 가지고 
    dot의 크기를 조절해서 캔버스에 그려줄 것이기 때문에. 즉, 검정색 dot의 크기만 조절해서 명암을 표현하는
    점묘화를 만들어낼 것이기 때문에, 굳이 dot마다 검정색 경계선 박스를 만들어줄 필요 없겠지? 
    */

    /**
     * 이 부분은 매 프레임마다 radius값에 변화를 줌으로써 dot이 마치 진동을 하는것처럼 움직이게 하려고 작성한 부분.
     * 
     * test-variation에서 dot하나의 움직임에 따라서 radius, accel, radiusV값이 어떻게 변하는지 코드로 구현해놓음.
     * 일단 이걸 보면서 참고하면 될 것 같고, 여기서 radius값이 어떻게 변화하는지 그래프를 확인해볼 것.
     * 
     * 지금 targetRadius = 10인데, (test-variation에서는 잘 보이도록 하려고 50으로 잡아 줌.)
     * 10을 가운데로 두고 그거보다 크게, 작게 왔다갔다 하다가 시간이 지날수록 점점 r값이 10에 정착이 됨.
     * 이런 걸 '감쇠 진동자, 감쇠 진동 그래프'라고 함. (구글 검색해볼 것)
     * 
     * BOUNCE 값은 radiusV가 너무 큰 값으로 +,-를 왔다갔다 하지 못하도록 함. 이걸 안곱해주면 radius가 -가 되는 순간이 옴.
     * 반지름이 -일 수는 없으니까 오류가 발생하겠지.
     * 
     * 또 accel에서 2를 나눠주는 이유도 2보다 작은 값으로 나눠줘버리면 그만큼 accel의 값은 커질 것이고
     * radiusV의 값도 커지기 때문에 radius의 감쇠 진동 그래프 상에서 targetRadius값만큼 이동하는 시간이 너무 빨라짐.
     * 또는 너무 작게 나눠버리면 BOUNCE를 곱하지 않았을 때와 마찬가지로 radiusV값이 너무 커져버려서 반지름이 음수가 되어버림.
     * 
     * 한 편, 2보다 큰 값으로 바꿔주게 되면 그만큼 accel, radiusV값도 작아지기 때문에, targetRadius에 도달하는 시간이
     * 오래걸리겠지. 그래서 진동하는 느낌이 잘 안들게 됨.
     * 
     * 어쨋든 이 정도까지만 이해를 하고 나중에 감쇠 진동 효과를 줘야 할 일이 있다면 이 공식을 활용할 것.
     * 더 깊게 파는것은 비효율적. 그냥 감쇠 진동자를 이해하고, 그걸 코드로 구현하려면 아래처럼 작성하면 된다고 생각할 것.
     */
    const accel = (this.targetRadius - this.radius) / 2;
    this.radiusV += accel;
    this.radiusV *= BOUNCE;
    this.radius += this.radiusV;

    ctx.beginPath();
    ctx.fillStyle = `#000` // ripple2에서는 dot의 크기만 가지고 명도를 표현할 거니까, dot은 검정색 컬러로 통일.
    ctx.arc(this.x, this.y, this.radius, 0, PI2, false);
    ctx.fill();
    // 이렇게 하면 위에 정사각형 안에 위치하는 원이 만들어지겠지
  }

  // 매번 클릭때마다 radius와 radiusV값을 다시 0으로 초기화해서 
  // 클릭할 때마다 항상 동일하게 감쇠 진동 변화값을 주려고 한 것.
  reset() {
    this.radius = 0;
    this.radiusV = 0;
  }
}