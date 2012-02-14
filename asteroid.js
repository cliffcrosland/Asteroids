window.Game = {};

// Random integer in range [low, high], inclusive
Math.randomInt = function(low, high) {
  var range = high - low + 1;
  return low + Math.floor(Math.random() * range);
}

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

// Spaceship
function Spaceship(x, y) {
  this.x = x;
  this.y = y;
  this.velMagnitude = 1;
  this.velX = this.velMagnitude;
  this.velY = 0;
  this.angle = Math.PI / 2;
  this.radius = 20;
  this.laserIsReady = true;
  this.dead = false;
}

Spaceship.prototype.drawSelf = function() {
  Game.context.beginPath();
  Game.draw.polygon(Game.context, 3, this.x, this.y, 20, this.angle);
  Game.context.stroke();
};

Spaceship.prototype.move = function () {
  this.checkCollisions();
  this.handleUserVelocityChange();
  this.handleUserShootInput();
  this.x += this.velX;
  this.y += this.velY;
  this.wrapAroundWorld();
}

Spaceship.prototype.checkCollisions = function () {
  for (var i = 0, len = Game.entities.length; i < len; i++) {
    var entity = Game.entities[i];
    if (entity.isDangerousToPlayer) {
      var dx = this.x - entity.x;
      var dy = this.y - entity.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < this.radius + entity.radius) {
        this.dead = true;
        this.explodeAgainst(entity);
      }
    }
  }
}

Spaceship.prototype.explodeAgainst = function (asteroid) {
  var vector = { 
    x : this.x - asteroid.x,
    y : this.y - asteroid.y
  };
  var magnitude = Math.sqrt(vector.x*vector.x + vector.y*vector.y);
  vector.x /= magnitude;
  vector.y /= magnitude;
  // Point on asteroid surface where spaceship collided
  var collidedAt = {
    x : asteroid.x + vector.x*asteroid.radius,
    y : asteroid.y + vector.y*asteroid.radius
  };
  // Explode particles from a sector on the outside of the asteroid.
  var numParticles = (this.laser ? 5 : 50);
  var sectorSize = Math.PI / 2; // Explode across a fourth of the asteroid.
  var xCoord = collidedAt.x - asteroid.x;
  var yCoord = collidedAt.y - asteroid.y; 
  var startTheta = Math.atan2(yCoord, xCoord) - sectorSize / 2;
  var deltaTheta = sectorSize / numParticles;
  var r = asteroid.radius;
  var debrisLifetime = this.laser ? 20 : 100;
  for (var i = 0; i < numParticles; i++) {
    var theta = startTheta + i * deltaTheta;
    var x = r * Math.cos(theta) + asteroid.x;
    var y = r * Math.sin(theta) + asteroid.y;
    Game.entities.push(new Debris(x, y, asteroid, debrisLifetime));
  }
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
    boost = 1.08;
  }
  this.velX *= boost;
  this.velY *= boost;
}

Spaceship.prototype.slowDown = function () {
  this.velX *= 0.9;
  this.velY *= 0.9;
}

Spaceship.prototype.isDead = function () { 
  return this.dead;
}

Spaceship.prototype.handleUserShootInput = function () {
  if (Game.keyboard.keysDown.spacebar && this.laserIsReady) {
    this.laserIsReady = false;
    this.shootLaser();
  } else if (!Game.keyboard.keysDown.spacebar) {
    this.laserIsReady = true; // On key up, the laser recharges
  } 
}

Spaceship.prototype.shootLaser = function () {
  Game.entities.push(new Laser(this));
}

//Laser
function Laser(source) {
  this.radius = 5;
  this.x = source.x;
  this.y = source.y;
  var sourceSpeed = Math.sqrt(source.velX*source.velX + source.velY*source.velY);
  var laserSpeed = 40;
  this.velX = source.velX * (sourceSpeed + laserSpeed) / sourceSpeed;
  this.velY = source.velY * (sourceSpeed + laserSpeed) / sourceSpeed;
  this.lifetime = 0;
  this.laser = true;
}

Laser.prototype.drawSelf = function () {
  Game.context.beginPath();
  Game.draw.circle(Game.context, this.x, this.y, this.radius);
  Game.context.fill();
}

Laser.prototype.move = function () {
  this.x += this.velX;
  this.y += this.velY;
  this.lifetime++;
  this.wrapAroundWorld();
  this.checkCollisions();
}

Laser.prototype.checkCollisions = function () {
  Spaceship.prototype.checkCollisions.call(this);
}

Laser.prototype.explodeAgainst = function (asteroid) {
  Spaceship.prototype.explodeAgainst.call(this, asteroid);
}

Laser.prototype.wrapAroundWorld = function () {
  Spaceship.prototype.wrapAroundWorld.call(this);
}

Laser.prototype.isDead = function () {
  if (this.dead) {
    return true;
  }
  var timeToLive = 40;
  if (this.lifetime > timeToLive) {
    return true;
  }
  return false;
}

//Asteroid
function Asteroid(x, y, radius) {
  this.x = x;
  this.y = y;
  this.velX = Math.randomInt(-10, 10);
  this.velY = Math.randomInt(-10, 10);
  this.radius = radius;
  this.isDangerousToPlayer = true;
}

Asteroid.prototype.drawSelf = function () {
  Game.context.beginPath();
  Game.context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
  Game.context.stroke();
}

Asteroid.prototype.move = function () {
  // this.checkCollisions();
  this.x += this.velX;
  this.y += this.velY;
  this.wrapAroundWorld();
}

Asteroid.prototype.wrapAroundWorld = function () {
  Spaceship.prototype.wrapAroundWorld.call(this);
}

Asteroid.prototype.isDead = function () {
  return false;
}

Asteroid.prototype.checkCollisions = function () { 
  for (var i = 0, len = Game.entities.length; i < len; i++) {
    var entity = Game.entities[i];
    console.log(entity != this);
    if (entity != this) {
      var dx = this.x - entity.x;
      var dy = this.y - entity.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < this.radius + entity.radius) {
        this.dead = true;
      }
    }
  }
}

function Debris(x, y, asteroid, lifetimeMax) {
  this.x = x;
  this.y = y;
  this.velX = this.x - asteroid.x;
  this.velY = this.y - asteroid.y;
  var magnitude = Math.sqrt(this.velX*this.velX + this.velY*this.velY);
  var speed = 1 + Math.random() * 10;
  this.velX = speed * (this.velX / magnitude) + asteroid.velX;
  this.velY = speed * (this.velY / magnitude) + asteroid.velY;
  this.lifetime = 0;
  this.lifetimeMax = lifetimeMax;
  this.radius = 3;
}

Debris.prototype.drawSelf = function () {
  Game.context.beginPath();
  Game.draw.circle(Game.context, this.x, this.y, this.radius);
  Game.context.fill();
}

Debris.prototype.move = function () {
  this.x += this.velX;
  this.y += this.velY;
  this.lifetime++;
  this.wrapAroundWorld(); 
}

Debris.prototype.wrapAroundWorld = function () { 
  Spaceship.prototype.wrapAroundWorld.call(this);
}

Debris.prototype.isDead = function () {
  if (this.lifetime > this.lifetimeMax) return true;
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
  setTimeout(Game.play, 30);
}

Game.step = function () {
  Game.draw.clear();
  Game.world.updateAllEntities();
}

Game.world = {
  updateAllEntities : function () {
    for (var i = 0; i < Game.entities.length; i++) {
      var entity = Game.entities[i];
      if (entity.isDead()) {
        Game.entities = Game.entities.slice(0, i).concat( Game.entities.slice(i+1) ); // remove the entity
        i--;
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
Game.entities.push(new Asteroid(30, 40, 50));
Game.entities.player = spaceship;
Game.play();

