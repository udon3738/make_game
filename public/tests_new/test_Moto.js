var moto;
var moto2;
var max_motor_speed;
var oldangle,newangle;

function Test_Moto() {
    camera.position.y = 0;
    camera.position.z = 15;

    tell('Use arrow keys or WSAD to move <br>R: revers | E: eject | Space: restart.');

    this.ground = new Hill({dy:2, w:240, h:-10, step:2, size:12, zone:12, friction: 1, restitution:0.8, userData: Constants.ID['ground']});

    this.input = { up:0, down:0, left:0, right:0 };

    moto = new Moto(world,gpx);
    
    this.moto = moto;
    this.needKill = false;
    this.moto.init(false);

    this.VFXIndex = 0;
    this.maxVFX = 50;
    this.VFX = [];

    for (var i = 0; i < this.maxVFX; i++) {
	this.VFX.push(null);
    }

    var psd = new b2ParticleSystemDef();
    psd.radius = 0.2;
    this.particleSystem = world.CreateParticleSystem(psd);

    renderer.updateColorParticles = true;

    world.SetContactListener(this);

    var bd = new b2BodyDef();
    bd.type = b2_kinematicBody;
    bd.position.Set(0, 8);
    moto2 = world.CreateBody(bd);

    box = new b2PolygonShape();
    box.SetAsBoxXY(1, 0.65);

    var fd = new b2FixtureDef();
    fd.shape = box;
    fd.friction = 0.6;
    fd.density = 2;

    moto2.CreateFixtureFromDef(fd);
}

function Moto(world,gpx, mirror) {
    if (mirror == null) { mirror = false; }

    this.bodyList = ['body', 'left_wheel', 'right_wheel', 'left_axle', 'right_axle'];

    this.isDestroy = true;
    this.world = world;
    this.mirror = mirror ? -1 : 1;
    this.rider = new Rider(world, this);
    this.isDead = false;

    this.position = new b2Vec2(0,0);

    this.player_start = new b2Vec2(gpx,0);
    
    //this.body = null;
}

Moto.prototype = {
    constructor: Moto,
    restart:function(ground){
	gpx = this.position.x;
        console.log(this.isDead)
 //       if (!this.isDead) return;
	testSwitch("Test_Moto");
	return;
         // destroy
        this.destroy();
        this.player_start = new b2Vec2();
        this.position = new b2Vec2();

        ground.redraw(this.position.x);

        // reInit
        this.init(true);
    },
    kill:function(){
        if (!this.isDead){ 
            this.isDead = true;
            this.rider.killJoint();
        }
    },
    destroy : function() {
        
        this.rider.destroy();

        this.world.DestroyJoint(this.left_revolute_joint);
        this.world.DestroyJoint(this.left_prismatic_joint);
        this.world.DestroyJoint(this.right_revolute_joint);
        this.world.DestroyJoint(this.right_prismatic_joint);

        var i = this.bodyList.length;
        while(i--) this.world.DestroyBody(this[this.bodyList[i]]);

        this.isDestroy = true;

        //this.body = null;
    },
    init : function(direct) {
        var pos = this.player_start;

        var i = this.bodyList.length, name;
        while(i--){ 
            name = this.bodyList[i];
            this[name] = world.add( cloneCST(Constants[name], this.mirror, pos) );
        }

        this.left_revolute_joint = this.create_revolute_joint(this.left_axle, this.left_wheel);
        this.right_revolute_joint = this.create_revolute_joint(this.right_axle, this.right_wheel);
        this.left_prismatic_joint = this.create_prismatic_joint(this.left_axle, Constants.left_suspension);
        this.right_prismatic_joint = this.create_prismatic_joint(this.right_axle, Constants.right_suspension);

        //console.log(this.right_prismatic_joint)

        this.rider.mirror = this.mirror;
        this.rider.init(direct);
        this.isDestroy = false;
        this.isDead = false;
    },
    move : function(input) {
        var air_density, drag_force, object_penetration, squared_speed, v;
        if (!input.up && !input.down) {
            v = this.left_wheel.GetAngularVelocity();
            this.left_wheel.ApplyTorque((Math.abs(v) >= 0.2 ? -v * 0.2 : 0));
            v = this.right_wheel.GetAngularVelocity();
            this.right_wheel.ApplyTorque((Math.abs(v) >= 0.2 ? -v * 0.02 : 0));
        }

        this.changeLeft();
        this.changeRight();

        air_density = Constants.air_density;
        object_penetration = 0.025;
        squared_speed = Math.pow(this.body.GetLinearVelocity().x, 2);
        drag_force = air_density * squared_speed * object_penetration;
        this.body.linearDamping = drag_force;

        if (this.right_wheel.GetAngularVelocity() > max_motor_speed) {
            this.right_wheel.SetAngularVelocity(max_motor_speed);
        } else if (this.right_wheel.GetAngularVelocity() < -max_motor_speed) {
            this.right_wheel.SetAngularVelocity(-max_motor_speed);
        }

        if (this.left_wheel.GetAngularVelocity() > max_motor_speed) {
            this.left_wheel.SetAngularVelocity(max_motor_speed);
        } else if (this.left_wheel.GetAngularVelocity() < -max_motor_speed) {
            this.left_wheel.SetAngularVelocity(-max_motor_speed);
        }

        this.position = this.getPosition();//body.GetWorldCenter();

    },
    changeRight: function(){
        var back_force = Constants.right_suspension.back_force;
        var rigidity = Constants.right_suspension.rigidity;
        var trans = this.right_prismatic_joint.GetJointTranslation();
        var max = rigidity + Math.abs(rigidity * 100 * Math.pow(trans, 2));
        var speed  = -back_force * trans;

        this.right_prismatic_joint.maxMotorForce = max;
        this.right_prismatic_joint.SetMotorSpeed(speed);
    },
    changeLeft: function(){
        var back_force = Constants.left_suspension.back_force;
        var rigidity = Constants.left_suspension.rigidity;
        var trans = this.left_prismatic_joint.GetJointTranslation();
        var max = rigidity + Math.abs(rigidity * 100 * Math.pow(trans, 2));
        var speed  = -back_force * trans;

        this.left_prismatic_joint.maxMotorForce = max;
        this.left_prismatic_joint.SetMotorSpeed(speed);
    },
    wheeling : function(force) {
        var force_leg, force_torso, moto_angle;
        moto_angle = this.mirror * this.body.GetAngle();
	v = this.body.GetAngularVelocity();
	if(v * force < 0) v=0;
        this.body.ApplyTorque(1/(Math.abs(v)+0.05)*this.mirror * force * 0.70);

        force_torso = rotate_point({ x: this.mirror * (-force), y: 0 }, moto_angle, { x: 0, y: 0 });
        force_torso.y = this.mirror * force_torso.y;

        this.rider.torso.ApplyForce(force_torso, this.rider.torso.GetWorldCenter());

        force_leg = rotate_point({ x: this.mirror * force, y: 0 }, moto_angle, { x: 0, y: 0 });
        force_leg.y = this.mirror * force_leg.y;
     
        this.rider.lower_leg.ApplyForce(force_leg, this.rider.lower_leg.GetWorldCenter());
    },
  
    flip : function() {
        if (!this.isDead) {
            flip(this);
        }
    },
    getPosition:function(){
        var p = this.body.GetWorldCenter();
        p.x -= this.mirror * Constants.body.x;
        p.y -= Constants.body.y;
        return p;
    },
    create_revolute_joint : function(axle, wheel) {
        return world.addJoint({ 
            type:'revolute', visible: false,
            bodyA: axle, bodyB: wheel,
            axis: wheel.GetWorldCenter()
        });

    },
    create_prismatic_joint : function(axle, cst) {
        return world.addJoint({ 
            type:'prismatic', visible: true,
            bodyA: this.body, bodyB: axle,
            axis:axle.GetWorldCenter(),
            angle: new b2Vec2(this.mirror * cst.angle.x, cst.angle.y),
            lowerTranslation: cst.lowerTranslation,
            upperTranslation: cst.upperTranslation,
            enableLimit:true, enableMotor:true
        });
    }
}


function Rider(world, moto) {

    this.bodyList = ['head', 'torso', 'lower_leg', 'upper_leg', 'lower_arm', 'upper_arm'];
    this.world = world;
    this.moto = moto;
    this.mirror = this.moto.mirror;
    this.isDead = false;
    //this.position = new b2Vec2();
    
};

Rider.prototype = {
    constructor: Rider,
    destroy : function() {
        if(!this.isDead){
            this.world.DestroyJoint(this.ankle_joint);
            this.world.DestroyJoint(this.wrist_joint);
        }
        this.world.DestroyJoint(this.neck_joint);
        this.world.DestroyJoint(this.knee_joint);
        this.world.DestroyJoint(this.elbow_joint);
        this.world.DestroyJoint(this.shoulder_joint);
        this.world.DestroyJoint(this.hip_joint);

        var i = this.bodyList.length;
        while(i--) this.world.DestroyBody(this[this.bodyList[i]]);

    },
    init : function(direct) {
        this.mirror = this.moto.mirror;
        var pos = this.moto.player_start;

        var i = this.bodyList.length, name;
        while(i--){ 
            name = this.bodyList[i];
	    if(direct&&name == "head"){
		this[name] = world.add( cloneCST(Constants[name+"2"], this.mirror, pos) );
	    }else{
		this[name] = world.add( cloneCST(Constants[name], this.mirror, pos) );
	    }
        }

        this.neck_joint = this.create_neck_joint();
        this.ankle_joint = this.create_joint(Constants.ankle, this.lower_leg, this.moto.body);
        this.wrist_joint = this.create_joint(Constants.wrist, this.lower_arm, this.moto.body);
        this.knee_joint = this.create_joint(Constants.knee, this.lower_leg, this.upper_leg, false, true, false);
        this.elbow_joint = this.create_joint(Constants.elbow, this.upper_arm, this.lower_arm, false, false, true);
        this.shoulder_joint = this.create_joint(Constants.shoulder, this.upper_arm, this.torso, true);
        this.hip_joint = this.create_joint(Constants.hip, this.upper_leg, this.torso, true, true, false);
        //console.log(this.knee_joint);

        this.isDead = false;
    },
    position : function() {
        return this.moto.body.GetPosition();
    },
    eject : function() {
        var adjusted_force_vector, eject_angle, force_vector;
        if (!this.moto.isDead) {
            this.moto.kill();
            force_vector = new b2Vec2(  150.0 * this.mirror,  0 );
            eject_angle = this.mirror * this.moto.body.GetAngle() + Math.PI / 4.0;
            //console.log(eject_angle)
            adjusted_force_vector = rotate_point(force_vector, eject_angle, { x: 0, y: 0});
            this.torso.ApplyForce(adjusted_force_vector, this.torso.GetWorldCenter());
        }
    },
    killJoint : function(){
        this.isDead = true;
        this.world.DestroyJoint(this.ankle_joint);
        this.world.DestroyJoint(this.wrist_joint);

        this.world.DestroyJoint( this.neck_joint );
        this.world.DestroyJoint( this.knee_joint );
        this.world.DestroyJoint( this.elbow_joint );
        this.world.DestroyJoint( this.shoulder_joint );
        this.world.DestroyJoint( this.hip_joint );
        this.shoulder_joint.EnableLimit( false );
    },
    setLimite : function(la, ua) {
        var l, u;
        if (this.mirror === 1) {
            l = -Math.PI / 15;
            u = Math.PI / 108;
        } else {
            l = -Math.PI / 108;
            u = Math.PI / 15;
        }

        if(la) l = l*10;
        if(ua) u = u*10;

        return {
            lowerAngle : l,
            upperAngle : u,
            enableLimit : true
        }
    },
    create_neck_joint : function() {
        return world.addJoint({ 
            type:'revolute', visible: false,
            bodyA: this.head, bodyB: this.torso,
            axis: this.head.GetWorldCenter()
        });

    },
    create_joint : function(cst, part1, part2, invert, la, ua) {
        if (invert == null) { invert = false; }
        var obj = this.setLimite(la, ua);
        obj.type = 'revolute';
        obj.visible = false;
        var pos = part1.GetWorldCenter();
        obj.axis = new b2Vec2();
        obj.axis.x = pos.x + this.mirror * cst.axe_position.x;
        obj.axis.y = pos.y + cst.axe_position.y;
        obj.bodyA = part1;
        obj.bodyB = part2;
        if (invert) {
            obj.bodyA = part2;
            obj.bodyB = part1;
        }
        return world.addJoint(obj);
    }
}

Test_Moto.prototype.contactList = function(a, b, list, n) {
    var i = list.length;
    while(i--){
        if(a === Constants.ID[list[i]] && b === Constants.ID[n]) return true;
        if(b === Constants.ID[list[i]] && a === Constants.ID[n]) return true;
    }
    return false;
};

Test_Moto.prototype.contact = function(a, b, n1, n2) {
    return (a === Constants.ID[n1]);
};

Test_Moto.prototype.BeginContactBody = function(contact) {
    var a = contact.GetFixtureA().body.GetUserData();
    var b = contact.GetFixtureB().body.GetUserData();

    if (!Constants.hooking) {
        this.needKill = this.contactList(a,b,['head', 'torso', 'upper_leg', 'lower_arm', 'upper_arm'], 'ground');
    } else {
        this.needKill = this.contact(a, b, 'head', 'ground');
    }
};

Test_Moto.prototype.onImput = function() {
    var biker_force, mirror, moto_acceleration;
    mirror = this.moto.mirror;
    moto_acceleration = Constants.moto_acceleration;
    biker_force = Constants.biker_force;

    if (!this.moto.isDead) {
        if (this.input.up) {
            this.moto.left_wheel.ApplyTorque(50/Math.abs(this.moto.left_wheel.GetAngularVelocity()+0.01)*(-this.moto.mirror * moto_acceleration+0.01));
        }
        if (this.input.down) {
            this.moto.right_wheel.SetAngularVelocity(0);
            this.moto.left_wheel.SetAngularVelocity(0);
        }
        if ((this.input.left && mirror === 1) || (this.input.right && mirror === -1)) {
            this.moto.wheeling(biker_force);
        }
        if ((this.input.right && mirror === 1) || (this.input.left && mirror === -1)) {
            biker_force = -biker_force * 0.8;
            this.moto.wheeling(biker_force);
        }
    }
}

Test_Moto.prototype.AddVFX = function(p) {
  var vfx = this.VFX[this.VFXIndex];
  if (vfx !== null) {
    vfx.Destroy();
    this.VFX[this.VFXIndex] = null;
  }
  this.VFX[this.VFXIndex] = new ParticleVFX(
    this.particleSystem, p, Math.rand(1, 2), Math.rand(10, 20), Math.rand(0.5, 1));

  if (++this.VFXIndex >= this.maxVFX) {
    this.VFXIndex = 0;
  }
};

Test_Moto.prototype.Step = function() {
    for (var i = 0; i < this.maxVFX; i++) {
	var vfx = this.VFX[i];
	if (vfx === null) {
	    continue;
	}

	vfx.Step(1/60);
	if (vfx.IsDone()) {
	    vfx.Destroy();
	    this.VFX[i] = null;
	}
    }
    newangle = this.moto.body.GetAngle();
    max_motor_speed += ((Math.abs(newangle/3.141592653589793238/2)>>0)-(Math.abs(oldangle/3.141592653589793238/2)>>0)) * 5;
    oldangle = newangle;
    console.log(max_motor_speed);
    if(!this.moto.isDestroy && !this.moto.isDead){
        if(this.needKill){
            this.moto.kill();
	    this.AddVFX(this.moto.position);
        }else{
            this.onImput();
            this.moto.move(this.input);
            this.ground.update(this.moto.position.x);
            follow(this.moto.position);
        }
        
    } else {
	camera.position.z *= 1.005;
	
	if(camera.position.z > 40){
	    this.moto.restart(this.ground);
	}
    }
    world.Step(1/60, 10, 10);
}

Test_Moto.prototype.Keyboard = function(char, code) {
    //console.log(code)
    switch (code) {
        case 90:case 87:case 38: this.input.up = 1; break;
        case 83:case 40: this.input.down = 1; break;
        case 81:case 65:case 37: this.input.left = 1; break;
        case 68:case 39: this.input.right = 1; break;
        case 69: this.moto.rider.eject(); break;
        case 82: this.moto.flip(); break;
        case 32: this.moto.restart(this.ground); break;
    }
};

Test_Moto.prototype.KeyboardUp = function(char, code) {
    switch (code) {
        case 90:case 87:case 38: this.input.up = 0; break;
        case 83:case 40: this.input.down = 0; break;
        case 81:case 65:case 37: this.input.left = 0; break;
        case 68:case 39: this.input.right = 0; break;
    }
};

function ParticleVFX(ps, origin, size, speed, lifetime) {
  var shape = new b2CircleShape;
  shape.position = origin;
  shape.radius = size;

  var pd = new b2ParticleGroupDef;
  pd.shape = shape;
  this.origColor = new b2ParticleColor(255,0,0, 255);
  pd.color = this.origColor;
  pd.flags = b2_powderParticle;
  this.particleSystem = ps;
  this.pg = this.particleSystem.CreateParticleGroup(pd);

  this.initialLifetime = this.remainingLifetime = lifetime;
  this.halfLifetime = this.initialLifetime * 0.5;

  var bufferIndex = this.pg.GetBufferIndex();
  var pos = this.particleSystem.GetPositionBuffer();
  var vel = this.particleSystem.GetVelocityBuffer();
  var count = this.pg.GetParticleCount();

  // the array is  2 times count
  for (var i = bufferIndex * 2; i < (bufferIndex + count) * 2; i += 2) {
    vel[i] = (pos[i] - origin.x) * speed;
    vel[i + 1] = (pos[i + 1] - origin.y) * speed;
  }
}

/**@return number*/
ParticleVFX.prototype.ColorCoeff = function() {
  if (this.remainingLifetime >= this.halfLifetime) {
    return 1;
  }
  return 1 - ((this.halfLifetime - this.remainingLifetime) / this.halfLifetime);
};

ParticleVFX.prototype.Step = function(dt) {
  if (this.remainingLifetime > 0.0) {
    this.remainingLifetime = Math.max(this.remainingLifetime - dt, 0.0);
    var coeff = this.ColorCoeff();

    var colors = this.particleSystem.GetColorBuffer();
    var bufferIndex = this.pg.GetBufferIndex();

    // Set particle colors all at once.
    // 4 bytes per color
    for (var i = bufferIndex * 4;
      i < (bufferIndex + this.pg.GetParticleCount())*4; i += 4) {
      colors[i+3] *= coeff;
      colors[i + 1] *= coeff;
      colors[i + 2] *= coeff;
    }
  }
};

/**@return bool*/
ParticleVFX.prototype.IsDone = function() {
  return this.remainingLifetime <= 0;
};

ParticleVFX.prototype.Destroy = function() {
  this.pg.DestroyParticles(false);
};



function cloneCST(constant, mirror, pos){
    var obj = {};
    for(var e in constant) obj[e] = constant[e];

    if(obj.shape == 'polygon' && mirror == -1) obj.vertices = revers_vertices(constant.vertices);
    if(obj.angle && mirror == -1) obj.angle = mirror * constant.angle;
    if(pos){
        obj.x = pos.x + mirror * constant.x;
        obj.y = pos.y + constant.y;
    }
    if(constant.decal){
       // obj.x = constant.decal.x;
       // obj.y = constant.decal.y;
        obj.angle = constant.decal.angle;
        constant.decal=null;
    }
    
    return obj;
};

function revers_vertices(vertices) {
    var newvertices = [];
    var len = vertices.length;
    for(var i=0; i<len; i+=2){
        newvertices.unshift(vertices[i+1]);
        newvertices.unshift(-vertices[i]);
    }
    return newvertices;
};

function rotate_point (point, angle, rotation_axe) {
    return new b2Vec2(
        rotation_axe.x + point.x * Math.cos(angle) - point.y * Math.sin(angle),
        rotation_axe.y + point.x * Math.sin(angle) + point.y * Math.cos(angle)
    );
};


var Constants = (function() {
    function Constants() {}

    Constants.ID = {
        'ground' : 1,
        'moto' : 2,
        'head' : 3,
        'torso': 4,
        'lower_leg': 5,
        'upper_leg': 6,
        'lower_arm': 7,
        'upper_arm': 8,
        'head2' : 11,
    }

    Constants.hooking = false;

    Constants.gravity = 9.81;

    max_motor_speed = 50.00;

    Constants.air_density = 0.03;

    Constants.moto_acceleration = 6.00;

    Constants.biker_force = 11.00;

    Constants.fps = 60.0;

    Constants.body = {
        shape:'polygon', x: 0.0,  y: 1.0, angle:0,
        density: 1.5, restitution: 0.2, friction: 1.0,
        vertices: [0.4, -0.3, 0.50, 0.40,-0.75, 0.16, -0.35, -0.3],
        groupIndex:-1, userData: Constants.ID['moto'],
        allowSleep:false, isSensor:false,
    };

    Constants.left_wheel = {
        shape:'circle', x: -0.70, y: 0.48, angle:0,
        radius: 0.40, density: 2.8, restitution: 0.3, friction: 1.4,
        groupIndex:-1, userData: Constants.ID['moto'],
        allowSleep:false, isSensor:false,
    };

    Constants.right_wheel = {
        shape:'circle', x: 0.70, y: 0.48, angle:0,
        radius: 0.40, density: 2.8, restitution: 0.3, friction: 1.4,
        groupIndex:-1, userData: Constants.ID['moto'],
        allowSleep:false, isSensor:false,
    };

    Constants.left_axle = {
        shape:'polygon', x: 0.0, y: 1.0, angle:0,
        density: 1.0, restitution: 0.2, friction: 1.0,
        vertices: [-0.10, -0.30, -0.25, -0.30, -0.80, -0.58,-0.65, -0.58],
        groupIndex:-1, userData: Constants.ID['moto'],
        allowSleep:false, isSensor:false,
    };

    Constants.right_axle = {
        shape:'polygon', x:0.0, y:1.0, angle:0,
        density: 1.5, restitution: 0.2, friction: 1.0,
        vertices: [0.58, -0.02, 0.48, -0.02, 0.66, -0.58, 0.76, -0.58],
        groupIndex:-1, userData: Constants.ID['moto'],
        allowSleep:false, isSensor:false,
    };

    Constants.head = {
        shape:'circle', x:-0.27, y: 2.26, radius: 0.18, angle:0,
        density: 0.4, restitution: 0.0, friction: 1.0,
        groupIndex:-1, userData: Constants.ID['head'],
        allowSleep:false, isSensor:false,
    };

    Constants.head2 = {
        shape:'circle', x:-0.27, y: 2.26, radius: 0.18, angle:0,
        density: 0.4, restitution: 0.0, friction: 1.0,
        groupIndex:-1, userData: Constants.ID['head'],
        allowSleep:false, isSensor:false,
    };

    Constants.torso = {
        shape:'polygon', x: -0.31, y: 1.89, angle: -Math.PI / 30.0,
        density: 0.4, restitution: 0.0, friction: 1.0,
        vertices: [0.10, -0.55, 0.13, 0.15, -0.20, 0.22, -0.18, -0.55],
        groupIndex:-1, userData: Constants.ID['torso'],
        allowSleep:false, isSensor:false,
    };

    Constants.lower_leg = {
        shape:'polygon', x: 0.07, y: 0.90, angle: -Math.PI / 6.0,
        density: 0.4, restitution: 0.0, friction: 1.0,
        vertices: [0.2, -0.33, 0.2, -0.27, 0.00, -0.2, 0.02, 0.33, -0.17, 0.33, -0.14, -0.33],
        groupIndex:-1, userData: Constants.ID['lower_leg'],
        allowSleep:false, isSensor:false,
    };

    Constants.upper_leg = {
        shape:'polygon', x: -0.15, y: 1.27, angle: -Math.PI / 11.0,
        density: 0.4, restitution: 0.0, friction: 1.0,
        vertices: [0.4, -0.14, 0.4, 0.07, -0.4, 0.14, -0.4, -0.08],
        groupIndex:-1, userData: Constants.ID['upper_leg'],
        allowSleep:false, isSensor:false,
    };

    Constants.lower_arm = {
        shape:'polygon', x: 0.07, y: 1.54, angle: -Math.PI / 10.0,
        density: 0.4, restitution: 0.0, friction: 1.0,
        vertices: [0.28, -0.07, 0.28, 0.04,-0.30, 0.07, -0.30, -0.06],
        groupIndex:-1, userData: Constants.ID['lower_arm'],
        allowSleep:false, isSensor:false,
    };

    Constants.upper_arm = {
        shape:'polygon', x: -0.20, y: 1.85, angle: Math.PI / 10.0,
        density: 0.4, restitution: 0.0, friction: 1.0,
        vertices: [0.09, -0.29, 0.09, 0.22, -0.11, 0.26, -0.10, -0.29],
        groupIndex:-1, userData: Constants.ID['upper_arm'],
        allowSleep:false, isSensor:false,
    };

    Constants.left_suspension = {
        angle: new b2Vec2(0, 1),
        lowerTranslation: -0.03,
        upperTranslation: 0.20,
        back_force: 3.00,
        rigidity: 8.00
    };

    Constants.right_suspension = {
        angle: new b2Vec2(-0.2, 1),
        lowerTranslation: -0.01,
        upperTranslation: 0.20,
        back_force: 3.00,
        rigidity: 4.00
    };

    Constants.ankle = { axe_position: { x: -0.18, y: -0.2 } };
    Constants.wrist = { axe_position: { x: 0.25, y: -0.07 } };
    Constants.knee = { axe_position: { x: 0.12, y: 0.28 } };
    Constants.elbow = { axe_position: { x: 0.03, y: -0.21 } };
    Constants.shoulder = { axe_position: { x: -0.12, y: 0.22 } };
    Constants.hip = { axe_position: { x: -0.25, y: 0.14 } };

    Constants.ground = { density: 1.0, restitution: 0.2, friction: 1.2 };

    return Constants;

  })();

function flip(moto){
    var old = {};
    var i, name, o;
    var rider = moto.rider;

    i = moto.bodyList.length, name, o;
    while(i--){ 
        name = moto.bodyList[i];
        o = moto[name];
        old[name] = { 
            //position: o.GetPosition(), angle: o.GetAngle(),
            linear:o.GetLinearVelocity(), angular: o.GetAngularVelocity() 
        };
    }
    i = rider.bodyList.length, name, o;
    while(i--){ 
        name = rider.bodyList[i];
        o = rider[name];
        old[name] = { 
            //position: o.GetPosition(), angle: o.GetAngle(),
            linear:o.GetLinearVelocity(), angular: o.GetAngularVelocity()
        };
    }

    // revers
    var p = moto.getPosition();

    if(moto.mirror === 1) moto.mirror = -1;
    else moto.mirror = 1;

    // destroy
    moto.destroy();
    moto.player_start = p;

    // reInit
    moto.init( true );

    i = moto.bodyList.length;
    while(i--){ 
        name = moto.bodyList[i];
        o = moto[name];
        if(name == 'left_wheel'){
            o.SetLinearVelocity(old['right_wheel'].linear);
            o.SetAngularVelocity(-old[name].angular);
        } else if(name == 'right_wheel'){
            o.SetLinearVelocity(old['left_wheel'].linear);
            o.SetAngularVelocity(-old[name].angular);
        }else{
            o.SetLinearVelocity(old[name].linear);
            o.SetAngularVelocity(old[name].angular);
        }
    }
    i = rider.bodyList.length, name, o;
    while(i--){ 
        name = rider.bodyList[i];
        o = rider[name];
        o.SetLinearVelocity(old[name].linear);
        o.SetAngularVelocity(old[name].angular);
    }

    old = {};

}

var socket = io();

socket.on('informtiming',function(){
    if(this.isDead)moto.position.y = 100;
    socket.emit("informcount",{
	pp:moto.position,
	pr:moto.body.GetAngle(),
	pv:moto.body.GetLinearVelocity(),
	pav:moto.body.GetAngularVelocity()
    });
});

socket.on('count',function(dat){
    dat.pp.y += 0.5;
    moto2.SetTransform(dat.pp,dat.pr);
    moto2.SetLinearVelocity(dat.pv);
    moto2.SetAngularVelocity(dat.pav);
});
