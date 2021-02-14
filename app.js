'use strict';

import {
  Ripple
} from './ripple.js';

import {
  Dot
} from './dot.js';

import {
  collide,
  getBWValue
} from './utils.js'

class App {
  constructor() {
    this.canvas = document.createElement('canvas');
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // 캔버스랑 2DContext를 하나씩 더 생성했네?
    // 여기서 생성한 tmpCanvas는 대신 body.appendChild를 하지 않기 때문에, DOM 구조 상에 존재하지 않게 됨.
    // 즉, 화면 상에 이 캔버스에 뭘 그리던 보이지는 않을 거라는 뜻임.
    // 그럼 뭐하러 만들었느냐? 
    // tmpCtx.drawImage()해서 tmpCtx에 동일한 이미지를 그려넣고
    // 해당 이미지에서 getImageData()로 색상 데이터값만 뽑아오려고 만든거임.
    // 왜 그렇게 하려고 하냐고? ripple2에서는 캔버스에 이미지는 보이지 않은 상태에서
    // 클릭 시 this.tmpCtx.getImageData()로 가져온 데이터를 이용해 dot만 생성하여 캔버스에 그려주려는 거!
    // 원래 ripple과는 좀 더 다른 느낌의 효과를 줄 수 있겠지!
    this.tmpCanvas = document.createElement('canvas');
    this.tmpCtx = this.tmpCanvas.getContext('2d');

    this.pixelRatio = window.devicePixelRatio > 1 ? 2 : 1;

    this.ripple = new Ripple(); // Ripple 인스턴스를 생성자에서 먼저 생성해 줌.

    window.addEventListener('resize', this.resize.bind(this), false);
    this.resize();

    // this.dot.animate()에 넘겨줄 파라미터의 값들을 정의.
    this.radius = 16; // this.dot.animate() 메소드에 넘겨줄 radius 값
    this.pixelSize = 16; // stageWidth, Height를 각각 16으로 나눠서 각각에 들어갈 dot이 들어갈 검정색 경계선 박스의 개수를 계산하려고 할당한 값.
    this.dots = []; // 생성한 dot 인스턴스들을 담아놓을 배열

    this.isLoaded = false; // 이미지 로드가 완료되었는지 아닌지를 판별해서 boolean값을 할당해줌.
    this.imgPos = {
      // 이미지가 캔버스 상에 그려질 x, y좌표값, width, height 값.
      // 즉, this.ctx.drawImage() 메소드에 넣어줄 dx, dy, dWidth, dHeight 값을 담아놓을 객체
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    this.image = new Image(); // HTMLImageElement 인스턴스를 생성함. 기능적으로는 document.createElement('img')와 동일함.
    this.image.src = 'flume2.jpg';
    // 이미지는 src 경로로 가져온다는 말 자체가 외부 데이터를 가져와야 한다는 뜻이고,
    // '외부데이터' 라는 말은 '로딩할 시간이 필요하다'는 말!
    // 캔버스에 그리려면 실제 jpg 이미지 로드가 끝난 다음에야 캔버스에 그릴 수 있게 되는 것!
    this.image.onload = () => {
      // 여기에서 load 되기를 기다렸다가, load가 끝나면 
      // this.isloaded를 true값으로 전환해주고, 캔버스에 해당 이미지를 뿌려주는 drawImage 메소드를 실행함.
      // 참고로 여기에 호출한 drawImage()는 캔버스 2DContext의 메소드가 아니라 App class 안에 정의한 메소드를 가리킴
      // 물론 이 메소드 안에 실제 캔버스 2DContext에 속한 drawImage() 메소드가 들어있기는 함.
      this.isLoaded = true;
      this.drawImage();
    };

    window.requestAnimationFrame(this.animate.bind(this)); // 생성자에서 애니메이션 바로 걸어서 호출해주고

    // 캔버스에 대해 클릭 이벤트를 걸어줌. this.ripple.start를 거쳐서
    // this.ripple.getMax로 전달할 임의의 (x, y)좌표를 
    // 클릭한 지점의 좌표값으로 전달하기 위해서 이벤트를 걸어놓았겠지?
    this.canvas.addEventListener('click', this.onClick.bind(this), false);
  }

  resize() {
    this.stageWidth = document.body.clientWidth;
    this.stageHeight = document.body.clientHeight;

    this.canvas.width = this.stageWidth * this.pixelRatio;
    this.canvas.height = this.stageHeight * this.pixelRatio;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);

    // 새롭게 생성한 tmpCanvas의 사이즈는 resize할 때마다 바뀌는 브라우저 사이즈와 동일하게 적용해줌.
    this.tmpCanvas.width = this.stageWidth;
    this.tmpCanvas.height = this.stageHeight;

    // this.ripple.getMax에서 브라우저 끝에 네 꼭지점의 좌표값을 계산하는데 필요한 브라우저의 width, height값을
    // 브라우저가 resize 될때마다 resize된 값으로 전달해줌.
    this.ripple.resize(this.stageWidth, this.stageHeight);

    if (this.isLoaded) {
      // 브라우저의 resize 이벤트가 발생하면, resize된 브라우저 창 비율에 맞게 load된 image를 캔버스에 그려주려는 것.
      // 참고로 여기에 호출한 drawImage()는 캔버스 2Dcontext의 메소드가 아니라 App class 안에 정의한 메소드를 가리킴
      this.drawImage();
    }
  }

  // 캔버스에서 브라우저 resize 이벤트에 대응하여 이미지를 렌더하는 방법!
  // 주의! 여기서 drawImage()는 캔버스 2Dcontext의 메소드가 아니라 App class 안에 정의한 메소드를 가리킴
  drawImage() {
    // 우선 현재 브라우저와 이미지 각각의 가로 / 세로 비율값을 계산하여 할당해놓음.
    const stageRatio = this.stageWidth / this.stageHeight;
    const imgRatio = this.image.width / this.image.height;

    // 또 기본적으로는 이미지를 this.ctx.drawImage()로 캔버스에 렌더할 때 
    // 캔버스의 width, height에 맞춰서 렌더하도록 함.
    // 즉, 브라우저의 크기변화에 따라서 캔버스에 렌더할 크기를 할당한 것임.
    // 만약 이 상태 그대로 캔버스에 렌더해버리면, 브라우저의 resize로 인해 stageRatio가 변할때마다
    // 캔버스에 렌더하는 사이즈의 비율도 그에 맞춰서 stretch되는, 즉 왜곡된 비율로 렌더될 수밖에 없음. 
    this.imgPos.width = this.stageWidth;
    this.imgPos.height = this.stageHeight;

    // 그러나 이 메소드는 지금 resize() 메소드에서도 호출되기 때문에, resize 이벤트가 발생해서 브라우저 사이즈의 비율이 변한다면,
    // 캔버스 사이즈의 비율도 변할 것이고, 그러면 캔버스에 렌더하는 이미지의 비율도 그에 맞춰 변환해줘야 한다.
    // 아래의 if, esle block에서 이 작업을 해주는 거임.
    if (imgRatio > stageRatio) {
      // 만약 resize된 현재 브라우저의 비율이 이미지의 비율보다 세로(height)로 더 길쭉하다면? 
      // 즉 브라우저의 width가 짜부된 모양이라면?
      this.imgPos.width = Math.round( // Math.round() 함수는 전달받은 값을 반올림한 수와 가장 가까운 정수 값을 반환함.
        // this.imgPos.width니까 이미지를 '캔버스 상에서' 렌더할 때 얼마만큼의 width로 렌더할 것인지를 정하는 거임.
        this.image.width * (this.stageHeight / this.image.height)
        // 근데 이 공식은 뭘까? 얘는 브라우저 사이즈가 세로로 길쭉해졌을 때
        // 이미지를 캔버스에 렌더하는 사이즈가 브라우저 사이즈 따라서 세로로 길쭉하게 stretch되는 걸 방지하는 거임.
        // 왜냐? 기본적으로 이미지를 캔버스에 렌더할 때의 width값을 
        // 원본 이미지 width에다가 this.stageHeight / this.image.height의 비율만큼 곱해서 늘려놓음으로써
        // 브라우저의 width는 짜부되더라도 캔버스에 렌더하는 width값은 찌부되지 않도록 해준 것임.
      );
      this.imgPos.x = Math.round(
        (this.stageWidth - this.imgPos.width) / 2
        // 그럼 브라우저 width가 짜부되었어도 캔버스에 렌더하는 width는 그대로니까 
        // drawImage() 메소드에서 crop을 안하더라도 어쩔 수 없이 이미지가 crop될 수밖에 없겠지?

        // 일단 캔버스에 렌더할 때 x좌표값을 짜부된 브라우저 width에서 짜부되지 않은 원본 이미지 width만큼을 뺀 값으로 한다 치면
        // 그렇게 하면 원본 이미지의 오른쪽 끝이 브라우저의 오른쪽 끝에 붙어있는 상태에서
        // 나머지 원본 이미지의 왼쪽 부분은 죄다 브라우저 바깥으로 넘어가버리는 거.
        // 이렇게 하면 이미지가 너무 왼쪽으로 몰빵되겠지? this.imgPos.x자체가 마이너스 값이니까!
        // 그래서 / 2를 해준거야. 그러면 이미지가 브라우저 왼쪽에서 짤린만큼의 width의 절반이 브라우저 오른쪽으로도 옮겨지면서
        // 짜부된 브라우저 width의 가운데에 위치하게 되겠지 
      );
      // console.log(`this.stageWidth: ${this.stageWidth}, this.imgPos.width: ${this.imgPos.width}, this.imgPos.x: ${this.imgPos.x}`);
    } else {
      // 이번에는 imgRatio = stageRatio가 같아서 이미지 원본 비율과 브라우저 비율이 딱 맞아떨어지거나
      // resize된 현재 브라우저의 비율이 이미지 비율보다 가로(width)로 더 길쭉하다면?
      // 즉 브라우저의 height가 짜부된 모양이라면?
      this.imgPos.height = Math.round(
        // 마찬가지로 캔버스에 렌더할 height값을 브라우저 따라서 짜부되지 않도록 늘려주고
        this.image.height * (this.stageWidth / this.image.width)
      );
      this.imgPos.y = Math.round(
        // 마찬가지로 브라우저 height값은 짜부됬어도 않은 캔버스에 렌더할 때의 height값은 최대한 원본에 가깝게 유지한다면
        // 원하지 않아도 crop이 발생할 수밖에 없고, 렌더할 때의 y 좌표값을 조정해서 최대한 캔버스에 렌더할 때
        // 짜부된 브라우저의 height의 가운데에 위치할 수 있도록 한 것.
        (this.stageHeight - this.imgPos.height) / 2
      );
    }

    /**
     * CanvasRenderingContext2D.drawImage()
     * 
     * 이 메소드에는 파라미터가 정말 많이 들어감. 간단히 3가지로 나눠서 설명할 수 있음. 
     * 좀 더 자세한 설명은 MDN 검색해서 그림으로 된 설명을 딱 보면 각각의 파라미터가 뭘 뜻하는 건지 감이 온다.
     * 
     * - 1번 parameter: 캔버스에 그릴 image element
     * - 2번 ~ 5번 parameter: Optional Parameter. 이미지 원본에서 crop해서 사용한다고 가정할 때, 이미지 원본 상에서 crop할 x, y좌표값과 width, height값
     * - 6번 ~ 9번 parameter: crop한 이미지 또는 원본 이미지를 캔버스 상에서 배치할 때 x, y 좌표값과 width, heigth 값. 
     */
    /*
    drawImage() 메소드 안에서도 로드된 이미지를 그려주지 않기로 함.

    this.ctx.drawImage(
      this.image, // imgElement가 들어가는 자리
      0, 0, // '이미지 원본 상에서' crop을 시작할 x, y좌표값
      this.image.width, this.image.height, // '이미지 원본 상에서' 얼마나 crop할 것인지 정해줄 width, height값.
      // 여기까지가 0, 0, image.width, image.height 이라는 건, 
      // ctx.drawImage() 메소드 자체에서는 crop 안하고 이미지 원본 그대로 가져와서 쓰겠다는 것.
      this.imgPos.x, this.imgPos.y, // '캔버스 상에서' 그리기 시작할 x, y좌표값
      this.imgPos.width, this.imgPos.height // '캔버스 상에서' 얼만큼의 사이즈로 그릴 것인지 정해줄 width, height값.
    );
    */

    // 새롭게 생성한 tmpCanvas의 2DContext인 tmpCtx에서도 브라우저 resize에 대응하여 캔버스에 이미지를 렌더해 줌.
    // 이 tmpCanvas의 context는 body에 appendChild 하지 않았기 때문에 화면상에 보이지는 않을거다.
    // 그럼 굳이 이걸 왜 만들었냐고? 이 캔버스에 drawImage한 거에서 getImageData로 모든 픽셀의 색상 데이터 배열을
    // 복사해오기 위해 만든거지!
    // 그니까 색상 데이터는 tmpCtx에서 가져오고, 그 값을 이용해서 dot을 생성하여 캔버스에 그리는건 그냥 ctx에다가 그려주는거지!
    // 이게 왜 필요하냐? ripple2에서는 이미지는 보이지 않도록 하고, 클릭 시 dot만 생성되서 캔버스에 그려줄려고
    // body에 appendChild하지 않은 상태의 캔버스와 컨텍스트를 하나 더 생성해놓은 거임.
    this.tmpCtx.drawImage(
      this.image,
      0, 0,
      this.image.width, this.image.height,
      this.imgPos.x, this.imgPos.y,
      this.imgPos.width, this.imgPos.height
    );

    /**
     * ctx.getImageData(x, y, width, height)
     * getImageData () 메소드는 위치, 사이즈가 지정된 캔버스 부분에 있는 모든 픽셀의 색상 데이터를 가져오고 변경할 수 있음.
     * 
     * 캔버스 튜토리얼 들었을 때 정리해서 깃허브에 커밋한 파일 참고 (canvas-basic-05 / video3.js)
     */
    // 지금 보이는 것처럼 getImageData로 색상 데이터 배열을 가져오는 건 tmpCtx에 그려진 이미지에서 가져올거임.
    // 이 tmpCtx에 drawImage()된 이미지는 화면에는 안보임. tmpCanvas를 body에 appendChild하지 않았기 때문!
    this.imgData = this.tmpCtx.getImageData(0, 0, this.stageWidth, this.stageHeight);

    // drawImage 메소드 안에서 브라우저 사이즈에 따른 개수들로 Dot 인스턴스들을 생성해주는 메소드 호출함.
    this.drawDots();
  }

  drawDots() {
    this.dots = [];

    // Math.ceil() 함수는 주어진 숫자보다 크거나 같은 숫자 중 가장 작은 숫자를 정수로 return해줌.
    // 그러니 각각 브라우저의 가로(stageWidth), 세로(stageHeight)에 들어갈 수 있는 dot의 개수가 할당되겠지?
    this.columns = Math.ceil(this.stageWidth / this.pixelSize);
    this.rows = Math.ceil(this.stageHeight / this.pixelSize);

    for (let i = 0; i < this.rows; i++) {
      // const y는 뭘까? 일단 i가 어디까지 반복되는건지 알아야 함.
      // i는 this.row 즉, 브라우저의 stageHeight에 들어갈 수 있는 검은색 경계선 박스의 갯수를 의미함.
      // 쉽게 말하면, 브라우저 높이값에 들어갈 수 있는 dots의 개수라고 할 수 있음.
      // 그럼 i는 당연히 높이값에 들어갈 수 있는 dots의 개수만큼 반복하는거지?
      // 그럼 예를 들어 i = 0일 때, 즉 첫번째 검은색 경계선 박스가 들어간다고 쳐보자.
      // 그 때 y값은 0.5 * this.pixelSize(= 30)이니까 15지? 근데 검은색 경게선 박스의 높이값은 30이지?
      // 이제 알겠다. 이거는 결국 각각의 검은색 경계선 박스와 dots들의 중앙점의 y 좌표값들을 구해놓은 거구나!
      const y = (i + 0.5) * this.pixelSize;

      // pixelY는 뭘까? 일단 Math.min(y, this.stageHeight)에서 무엇이 return될지 알아보자.
      // 당연히 y는 모든 dot들의 y좌표값이기 때문에, 거의 항상 y < this.stageHeight일테니 y값이 return될거임.
      // pixelY는 거의 항상 각 dot의 중심점의 y좌표값이 할당됨.
      // 그럼 왜 굳이 Math.min, max 메소드를 사용한걸까? pixelY에 대한 범위값을 정하려고 했던거지.
      // 이렇게 min, max 메소드를 사용하면 0 <= pixelY <= this.stageHeight의 범위 내에서 pixelY값을 얻게 됨.
      const pixelY = Math.max(Math.min(y, this.stageHeight), 0);

      for (let j = 0; j < this.columns; j++) {
        // const x도 마찬가지. 각각의 검은색 경계선 박스와 dots들의 중앙점의 x좌표값들을 구해놓은 것.
        const x = (j + 0.5) * this.pixelSize;

        // pixelX도 거의 항상 각 dot의 중심점의 x좌표값이 할당되나,
        // 그 값의 범위가 0 <= pixelX <= this.stageWidth를 넘지 못하게 하려고 min, max를 쓴거고
        const pixelX = Math.max(Math.min(x, this.stageWidth), 0);

        // pixelIndex에서 4를 곱하는 이유가 뭘까?
        // getImageData()로 복사해 온 모든 픽셀들의 색상데이터(rgba값)이 들어간 배열에서는
        // (pixelX + pixelY * this.stageWidth)번째 pixel의 첫번째 색상 데이터(r값)에 해당하는 index는
        // (pixelX + pixelY * this.stageWidth) * 4 번째 index임.
        // 그래서 const pixelIndex에는 정확히 말하면 
        // 'this.imgData.data 배열 상에서 해당 번째 픽셀의 r값의 index'가 할당되는 거임. 

        // 그래서 밑에 const red, green, blue에서 
        // 항상 각 픽셀의 색상데이터들 안에서 0번째, 1번째, 2번째 index로 r, g, b 값에 순서대로 접근할 수 있는거임. 
        const pixelIndex = (pixelX + pixelY * this.stageWidth) * 4;
        // 그렇다면, 몇 번째 픽셀인지를 왜 (pixelX + pixelY * this.stageWidth)로 계산하는 걸까?
        // 어떤 픽셀에 접근해서 그 픽셀의 색상 데이터를 추출해오고 싶은걸까?
        // 바로 해당 dot의 중심점 좌표 (x, y)에 위치한 픽셀의 색상 데이터를 추출해 오려는거
        // 그 픽셀이 몇 번째 픽셀인지 계산하려면 어떻게 해야겠어?
        // 예를 들어 y좌표값이 15라고 해보자. 
        // 그럼 y좌표값이 0(y좌표값도 0이 될 수 있지?), 1, 2, 3 ,... ,14일 때의 row에 위치한 모든 픽셀들의 갯수를 계산해줘야 함. 
        // 즉, 총 15개의 row에 위치한 모든 픽셀들을 계산해줘야 함. 그러고 나서 x좌표값 만큼을 더해주면 되겠지?
        // 따라서 'pixelY = 픽셀 개수를 계산해줘야 할 row의 개수' 가 동일하기 때문에, pixelY를 바로 곱해준 것!

        const red = this.imgData.data[pixelIndex + 0]; // 해당 픽셀의 r값에 해당하는 데이터에 접근
        const green = this.imgData.data[pixelIndex + 1]; // 해당 픽셀의 g값에 해당하는 데이터에 접근
        const blue = this.imgData.data[pixelIndex + 2]; // 해당 픽셀의 b값에 해당하는 데이터에 접근

        // getBWValue 함수의 isReversed값이 들어갈 자리에 false를 전달해줬으니
        // scale에는 255(픽셀의 색상이 어두운 명도일수록) ~ -127(밝은 명도일수록) 사이의 값이 할당될 거임.
        // scale은 사실상 dot의 중심점에 위치한 픽셀의 명도를 표현한 값.
        // 만약 isReversed = true로 전달해준다면?
        // scale에는 0(어두운 명도일수록) ~ 382(밝은 명도일수록) 사이의 값을 할당해줄 것이고,
        // 결과적으로 dot.js에서 targetRadius에 0(어두울수록) ~ 11.9375(밝을수록) 사이의 값이 할당될 것이고,
        // 이번에는 반대로 픽셀이 어두운 애들일수록 반지름이 작은 dot이 생성됨과 동시에
        // 아래의 if block에 의해 targetRadius가 0.1보다 작은 정도로 어두운 애들은 캔버스에 그려지지 않을거임.
        // isReversed 값은 일종의 흑백반전을 만들어주는 아이라고 할 수 있음.
        const scale = getBWValue(red, green, blue, false);

        // 이중 for loop를 통해서 각 dot들의 x, y 좌표값, 그 좌표값들에 위치한 픽셀의 색상데이터 red, green, blue
        // 얘내들을 모두 구한 뒤에 this.radius, this.pixelSize랑 같이 넣어서 Dot 인스턴스들을 생성해줌.
        const dot = new Dot(
          x, y,
          this.radius, // 얘는 생성자에서 16으로 할당됨. 
          this.pixelSize, // 얘도 생성자에서 16으로 할당됨.
          red, green, blue,
          scale // Dot 인스턴스를 새롭게 생성할 때, dot의 중심점에 위치한 픽셀의 명도값을 전달함.
        );

        // 생성한 dot 인스턴스의 targetRadius값이 0.1보다 큰 인스터스들만 dots 배열에 순서대로 넣어줌.
        // 이 말은, 해당 dot의 중심점 픽셀의 명도가 너무 밝아서 targetRadius가 0.1도 안되는 애들은
        // dots배열에도 넣지 않을 것이고, dots 배열에 포함이 안되면 결국 캔버스에도 그리지 않겠다는 것!
        if (dot.targetRadius > 0.1) {
          this.dots.push(dot);
        }
      }
    }
  }

  animate() {
    window.requestAnimationFrame(this.animate.bind(this)); // 내부에서 스스로를 반복 호출할 수 있게 해주고

    // animate() 메소드에서도 프레임들을 매번 한 번씩 지우줌으로써
    // 각각의 dot의 진동 표현을 위해서 frame마다 그리던 dot의 흔적들을 지워줌으로써
    // 각각의 dot마다의 진동 애니메이션이 제대로 보이도록 한 것.
    this.ctx.clearRect(0, 0, this.stageWidth, this.stageHeight);

    this.ripple.animate(this.ctx); // ripple.js안에 실제로 캔버스에 arc를 그려줄 animate 메소드를 반복호출함.

    // 생성된 dot 인스턴스들의 개수만큼 for loop를 반복해 줌.
    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i]; // 여기에 dot은 위에 drawDots()메소드에 for loop 안에 있는 const dot과 상관없음.

      /**
       * app.js 의 animate() 메소드에서 
       * collide(dot.x, dot.y, this.ripple.x, this.ripple.y, this.ripple.radius) 이렇게 전달해줄거임.
       * 
       * 그럼 어떻게 되겠어? 
       * 내가 클릭한 ripple의 중심점 좌표와 app.js에 있는 dots 배열안에 담긴 각각의 dot들 사이의
       * 거리값을 가져와서, 그게 현재 프레임의 this.ripple.radius값보다 작다면, true를 return하고 아니면 false를 return하겠지
       * 
       * 즉, 현재 프레임에 그려진 ripple의 범위 안에 중심좌표값이 위치한 dot들에 대해서만 true를 return하라는 뜻!
       * 
       * 그래서 true에 해당하는 dot들만 해당 프레임에서 dot.animate로 캔버스에 dot과 경계선 박스를 그려주라는 거지.
       * 현재 프레임에 그려진 ripple의 반지름 내에 들어와있는, ripple 안에 중심점 좌표가 위치한 dot과 경계선 박스들만 그려주라는 것.
       */
      if (collide(
          dot.x, dot.y,
          this.ripple.x, this.ripple.y,
          this.ripple.radius
        )) {
        dot.animate(this.ctx);
      }
    }
  }

  onClick(e) {
    // 클릭할 때마다 클릭 지점의 좌표를 중심으로 ripple이 생기면서 점점 커지는 애니메이션이 그려질거임.
    // this.ripple.start(e.offsetX, e.offsetY); 로 클릭 지점의 좌표값을 넘겨줬으니까!

    // 그런데 매번 클릭할 때마다 이전에 클릭해서 생긴 ripple 애니메아션을 지워주고 싶은거지
    // 그래서 클릭할 때마다 clearRect로 싹 한번 지워주고, 
    // 브라우저가 resize된 상태에 따라서 캔버스에 이미지를 렌더해준 뒤에
    // 넘겨준 클릭 지점 좌표를 중심으로 ripple 애니메이션을 다시 그려주도록 한 것. 
    this.ctx.clearRect(0, 0, this.stageWidth, this.stageHeight);

    // 캔버스에서 클릭 이벤트를 받음과 동시에 생성된 dot 인스턴스들의 개수만큼 for loop를 반복하라는 뜻
    // 이거는 뭐냐면 클릭할 때마다 this.dot.radius, this.dot.radiusV값을 각각 0으로 초기화해줘서
    // radius값을 처음 클릭했을 때와 동일하게 감쇠 진동 그래프로 변화시킬 수 있도록 한 것.
    // 왜냐면 처음 클릭했을 때에도 radius, radiusV는 0부터 감쇠 진동으로 값이 변해갔으니까! 
    for (let i = 0; i < this.dots.length; i++) {
      this.dots[i].reset()
    }

    /*
    클릭할 때마다 로드된 이미지를 새로 캔버스에 그려주지 않기로 함.
    this.ctx.drawImage(
      this.image,
      0, 0,
      this.image.width, this.image.height,
      this.imgPos.x, this.imgPos.y,
      this.imgPos.width, this.imgPos.height
    );
    */

    this.ripple.start(e.offsetX, e.offsetY);
  }
}

window.onload = () => {
  new App();
};