window.Game = {};

Game.init = function () {
  Game.canvas = document.getElementById("canvas");
  Game.context = canvas.getContext('2d');
  window.addEventListener("keydown", Game.keyboard.handleKeyDown, true);
  window.addEventListener("keyup", Game.keyboard.handleKeyUp, true);
};

Game.keyboard = {
  keysDown : {left : false, right : false, up : false, down : false, spacebar: false },
  handleKeyDown : function(evt) {
    switch(evt.keyCode) {
      case 32: // spacebar
        Game.keyboard.keysDown.spacebar = true;
        break;
      case 37: // left
        Game.keyboard.keysDown.leftArrow = true;
        break;
      case 38: // up 
        Game.keyboard.keysDown.upArrow = true;
        break;
      case 39: // right
        Game.keyboard.keysDown.rightArrow = true;
        break;
      case 40: // down
        Game.keyboard.keysDown.downArrow = true;
        break; 
    }
  },
  handleKeyUp : function(evt) {
    switch(evt.keyCode) {
      case 32: // spacebar
        Game.keyboard.keysDown.spacebar = false;
        break;
      case 37: // left
        Game.keyboard.keysDown.leftArrow = false;
        break;
      case 38: // up 
        Game.keyboard.keysDown.upArrow = false;
        break;
      case 39: // right
        Game.keyboard.keysDown.rightArrow = false;
        break;
      case 40: // down
        Game.keyboard.keysDown.downArrow = false;
        break; 
    }
  }
};

// == Entities ==
Game.entities = []; // Global collection of all entities in scene.
Game.entities.player = null;

function Spaceship(x, y) {
  this.x = x;
  this.y = y;
  this.velMagnitude = 1;
  this.velX = this.velMagnitude;
  this.velY = 0;
  this.angle = Math.PI / 2;
  this.radius = 20;
}

Spaceship.prototype.drawSelf = function() {
  Game.context.beginPath();
  Game.draw.polygon(Game.context, 3, this.x, this.y, 20, this.angle);
  Game.context.stroke();
};

Spaceship.prototype.move = function () {
  this.handleUserVelocityChange();
  this.handleUserShootInput();
  this.x += this.velX;
  this.y += this.velY;
  this.wrapAroundWorld();
}

Spaceship.prototype.wrapAroundWorld = function () {
  var radius = this.radius || 10;
  if (this.x > Game.canvas.width + radius) {
    this.x = -1 * radius;
  }
  if (this.x < -1 * radius) {
    this.x = Game.canvas.width + radius;
  }
  if (this.y > Game.canvas.height + radius) {
    this.y = -1 * radius;
  }
  if (this.y < -1 * radius) {
    this.y = Game.canvas.height + radius;
  }
}

Spaceship.prototype.handleUserVelocityChange = function () {
  if (Game.keyboard.keysDown.leftArrow)
    this.turnLeft();
  if (Game.keyboard.keysDown.rightArrow)
    this.turnRight();
  if (Game.keyboard.keysDown.upArrow)
    this.speedUp();
  if (Game.keyboard.keysDown.downArrow)
    this.slowDown();
}

Spaceship.prototype.turnLeft = function () {
  this.angle -= Math.PI / 20;
  var magnitude = Math.sqrt(this.velX * this.velX + this.velY * this.velY);
  this.velX = magnitude * Math.sin(this.angle);
  this.velY = -1 * magnitude * Math.cos(this.angle);
}

Spaceship.prototype.turnRight = function () {
  this.angle += Math.PI / 20;
  var magnitude = Math.sqrt(this.velX * this.velX + this.velY * this.velY);
  this.velX = magnitude * Math.sin(this.angle);
  this.velY = -1 * magnitude * Math.cos(this.angle);
}

Spaceship.prototype.speedUp = function () {
  // Special case.  If fully stopped, then give it a jolt to begin with.
  var boost, magnitude = Math.sqrt(this.velX * this.velX + this.velY * this.velY);
  if (magnitude < 3) {
    boost = 2;
  } else {
    boost = 1.1;
  }
  this.velX *= boost;
  this.velY *= boost;
}

Spaceship.prototype.slowDown = function () {
  this.velX *= 0.9;
  this.velY *= 0.9;
}

Spaceship.prototype.isDead = function () { 
  return false;  // I am invincible!
}

Spaceship.prototype.handleUserShootInput = function () {
  if (Game.keyboard.keysDown.spacebar) {
    this.shootLaser();
  }
}

Spaceship.prototype.shootLaser = function () {
  Game.entities.push(new Laser(this));
}

function Laser(source) {
  this.x = source.x;
  this.y = source.y;
  var sourceSpeed = Math.sqrt(source.velX*source.velX + source.velY*source.velY);
  var laserSpeed = 40;
  this.velX = source.velX * (sourceSpeed + laserSpeed) / sourceSpeed;
  this.velY = source.velY * (sourceSpeed + laserSpeed) / sourceSpeed;
  this.lifetime = 0;
}

Laser.prototype.drawSelf = function () {
  Game.context.beginPath();
  Game.draw.circle(Game.context, this.x, this.y, 5);
  Game.context.fill();
}

Laser.prototype.move = function () {
  this.x += this.velX;
  this.y += this.velY;
  this.lifetime++;
  this.wrapAroundWorld();
}

Laser.prototype.wrapAroundWorld = function () {
  Spaceship.prototype.wrapAroundWorld.apply(this);
}

Laser.prototype.isDead = function () {
  var timeToLive = 40;
  if (this.lifetime > timeToLive) {
    return true;
  }
  return false;
}
// == Drawing == 

Game.draw = {
  polygon : function(c, nsides, x, y, radius, angle, counterclockwise) {
    angle = angle || 0;
    var r = radius + 10; // This is done to make the direction of the spaceship more clear.
    counterclockwise = counterclockwise || false;
    c.moveTo(x + r * Math.sin(angle), y - r * Math.cos(angle));
    r = radius;
    var delta = Math.PI * 2 / nsides;
    for (var i = 1; i < nsides; i++) {
      angle += counterclockwise?-delta:delta;
      c.lineTo(x + r * Math.sin(angle), y - r * Math.cos(angle));
    }
    c.closePath();
  },
  circle : function(c, x, y, radius) {
    c.arc(x, y, radius, 0, 2*Math.PI, false);
    c.closePath();
  },
  clear : function () {
    Game.canvas.width = Game.canvas.width; // Seems hacky, but works great.
  },
  renderAllEntities : function () {
    for (var i = 0, len = Game.entities.length; i < len; i++) {
      var entity = Game.entities[i];
      entity.drawSelf();
    }
  }
}

// == Play == 
Game.play = function () {
  Game.step();
  setTimeout(Game.play, 50);
}

Game.step = function () {
  Game.draw.clear();
  Game.world.updateAllEntities();
}

Game.world = {
  updateAllEntities : function () {
    for (var i = 0, len = Game.entities.length; i < len; i++) {
      var entity = Game.entities[i];
      if (entity.isDead()) {
        Game.entities.slice(0, i).concat( Game.entities.slice(i+1) ); // remove the entity
      } else {
        entity.move();
        entity.drawSelf();
      }
    }
  }
}

// == Main ==
Game.init();

var spaceship = new Spaceship(300, 100);
Game.entities.push(spaceship);
Game.entities.player = spaceship;
Game.play();

