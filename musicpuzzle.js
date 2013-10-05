//globals
var DURATION = 15;
var GAME = {};

GAME.board = document.getElementById('board');
GAME.listen = document.getElementById('listen');

GAME.pause = false;
GAME.stop = false;
GAME.state = 0;
GAME.order_input = document.getElementById('order_input');
GAME.order = [];
GAME.sound;
GAME.currentLevel = 0;

//functions
function search(event){
  var name = this.q.value;
  console.log(name)
  DZ.api('/search?q=' + name, setupLevels);
  event.preventDefault();
  return false;
}

function setupLevels(resp) {
  var data = resp.data;
  if (!data || data.length < 6) {
    alert("Not enough relults, Try again with an other artist");
    return;
  }
  GAME.levels = [];
  var r = shuffled(data.length);
  for (var j = 0; j < data.length; j++) {
    i = r[j];
    if (data[i].preview && data[i].title && data[i].artist && data[i].artist.name){
      GAME.levels.push({
        src: data[i].preview,
        nb: Math.floor(j/3) + 4,
        title: data[i].artist.name + ' - ' + data[i].title
      })
    }
  }
  preload(0)
  setup(GAME.levels[0]);
}

function preload(level) {
  if (level < GAME.levels.length) {
    GAME.nextSound = new Audio(GAME.levels[level]['src']);
  }
}

function setup(config){
  GAME.board.innerHTML = "";
  GAME.sound = null;
  GAME.state = 0;
  GAME.order = shuffled(config.nb);
  while (is_sorted(GAME.order)) {
    GAME.order = shuffled(config.nb);
  }
  var cwidth = parseInt(window.getComputedStyle(GAME.board).width.slice(0,-2)) / config.nb;
  for (var i = 0; i < GAME.order.length; i++) {
    var ncube = cube(i+1, GAME.order[i]);
    GAME.board.appendChild(ncube);
  };
  $('.cube').css({width: cwidth - 2});
  $('#board').disableSelection();
  $('#board').sortable();
  $('#board').sortable( "disable" );

  GAME.sound = GAME.nextSound;
  document.getElementById('title').textContent = config.title;

  GAME.listen.addEventListener('click', listen);

  document.getElementById('pause').addEventListener('click', function(){
    // console.log('pause');
    GAME.sound.pause();
    GAME.pause = true;
  });

  document.getElementById('stop').addEventListener('click', function(){
    // console.log('stop');
    GAME.sound.pause();
    GAME.stop = true;
    GAME.board.style.background = '#999';
    GAME.state = 0;
    window.setTimeout(function(){
      GAME.stop = false;
      game();
    }, 150);
  });

  preload(GAME.currentLevel + 1);
  game();
}

function game(){
  // console.log('game');
  GAME.listen.disabled = false;
  document.getElementById('pause').disabled = true;
  document.getElementById('stop').disabled = true;

  $('#board').sortable("enable");
  GAME.board.style.background = '#999';


  GAME.stop = false;
  GAME.pause = false;
  GAME.state = 0;
}


function music(){
  // console.log('music');
  $('#board').sortable( "disable" );

  GAME.listen.disabled = true;
  document.getElementById('pause').disabled = false;
  document.getElementById('stop').disabled = false;
  // remove things about moving cubes around
}


function win_sequence(){
  // console.log('win');
  player(function(){
    GAME.board.classList.add('winner');
    window.setTimeout(function(){
      GAME.sound.pause();
      GAME.state = 0;
      GAME.stop = false;
      GAME.pause = false;

      if (GAME.currentLevel < GAME.levels.length) {
        GAME.currentLevel++;
        setup(GAME.levels[GAME.currentLevel]);
        GAME.board.classList.remove('winner');
        game();
      }
    }, 1200);
  });
}

function listen(){
  // console.log('listen');
  music();
  //get the order
  GAME.order = [];
  for (var i = 0; i < GAME.board.children.length; i++) {
    GAME.order.push(parseInt(GAME.board.children[i].getAttribute('data-order')));
  };

  if (is_sorted(GAME.order)) {
    win_sequence();
  } else {
    player();
  }
}

function cube(name, rank){
  var cube = document.createElement('li');
  cube.classList.add('cube');
  cube.classList.add('ui-state-default');
  cube.textContent = name;
  cube.setAttribute('data-order', rank);
  return cube;
}



// helpers
function shuffled(nb){
  var result = [];
  for (var i = nb - 1; i >= 0; i--) {
    result.push(i);
  };
  for (var i = result.length - 1; i >= 0; i--) {
    var rand = Math.floor(Math.random() * nb);
    var tmp = result[i];
    result[i] = result[rand];
    result[rand] = tmp;
  };
  return result
}

function is_sorted(arr) {
    var len = arr.length - 1;
    for(var i = 0; i < len; ++i) {
        if(arr[i] > arr[i+1]) {
            return false;
        }
    }
    return true;
}


// return a function that gives back the position in which the track should
// be at a certain time, depending on the order.
function position(order){
  var nb = order.length;
  var d = DURATION * 1000;
  var slot_d = d / nb;
  return function(ellapsed){
    return order[Math.floor(ellapsed / slot_d)] * slot_d + (ellapsed % slot_d);
  };
}

function player(callback) {
  // console.log('player');
  GAME.pause = false;
  GAME.stop = false;
  // set the pos calculator
  var pos = position(GAME.order);
  // set systemTime
  var start = Date.now() - GAME.state;

  GAME.sound.currentTime = pos(0) / 1000;
  GAME.sound.play();

  (function loop() {
    // check the position where it should be
    var norm = pos(Date.now() - start);
    var current = GAME.sound.currentTime * 1000;

    if (Date.now() - start >= DURATION * 1000) {
      GAME.sound.pause();
      if (callback) {
        callback();
      }
      window.setTimeout(game, 80);
      return;
    }

    if (GAME.stop) {
      return;
    }

    if (GAME.pause) {
      GAME.pause = false;
      GAME.listen.disabled = false;
      return;
    }

    if (Math.abs(norm - current) > 100) {
      GAME.sound.currentTime = (pos(Date.now() - start) + 100) / 1000;
    }


    GAME.state = Date.now() - start;
    var progress = 100 * (Date.now() - start) / (DURATION * 1000);
    GAME.board.style.background = '-webkit-linear-gradient(left, red ' + progress + '%, #999 ' + progress + '%)';
    GAME.board.style.backgroundImage = 'linear-gradient(to right, red ' + progress + '%, #999 ' + progress + '%)';
    window.setTimeout(loop, 150);

  })();
}

// get the artist to start the game
document.getElementById('artist').addEventListener('submit', search);
