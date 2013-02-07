/*global CANNON:true */

/**
 * @class CANNON.HingeConstraint
 * @brief Hinge constraint. Tries to keep the local body axes equal.
 * @author schteppe
 * @param CANNON.RigidBody bodyA
 * @param CANNON.Vec3 pivotA A point defined locally in bodyA. This defines the offset of axisA.
 * @param CANNON.Vec3 axisA an axis that bodyA can rotate around.
 * @param CANNON.RigidBody bodyB
 * @param CANNON.Vec3 pivotB
 * @param CANNON.Vec3 axisB
 * @param float maxForce
 */
CANNON.HingeConstraint = function(bodyA, pivotA, axisA, bodyB, pivotB, axisB, maxForce){
    maxForce = maxForce || 1e6;
    var that = this;
    // Equations to be fed to the solver
    var eqs = this.equations = {
        rotational1: new CANNON.RotationalEquation(bodyA,bodyB),
        rotational2: new CANNON.RotationalEquation(bodyA,bodyB),
        p2pNormal:   new CANNON.ContactEquation(bodyA,bodyB),
        p2pTangent1: new CANNON.ContactEquation(bodyA,bodyB),
        p2pTangent2: new CANNON.ContactEquation(bodyA,bodyB),
    };

    var r1 = eqs.rotational1;
    var r2 = eqs.rotational2;
    var normal = eqs.p2pNormal;
    var t1 = eqs.p2pTangent1;
    var t2 = eqs.p2pTangent2;

    t1.minForce = t2.minForce = normal.minForce = -maxForce;
    t1.maxForce = t2.maxForce = normal.maxForce =  maxForce;

    var unitPivotA = pivotA.unit();
    var unitPivotB = pivotB.unit();

    var axisA_x_pivotA = axisA.cross(unitPivotA);
    var axisA_x_axisA_x_pivotA = axisA.cross(axisA_x_pivotA);
    var axisB_x_pivotB = axisB.cross(unitPivotB);

    axisA_x_pivotA.normalize();
    axisB_x_pivotB.normalize();

    // Motor stuff
    var motorEnabled = false;
    this.motorTargetVelocity = 0;
    this.motorMinForce = -maxForce;
    this.motorMaxForce = maxForce;
    this.enableMotor = function(){
        if(!motorEnabled){
            eqs.motor = new CANNON.RotationalMotorEquation(bodyA,bodyB,maxForce);
            motorEnabled = true;
        }
    };
    this.disableMotor = function(){
        if(motorEnabled){
            motorEnabled = false;
            delete eqs.motor;
        }
    };

    // Update 
    this.update = function(){
        // Update world positions of pivots
        /*
        bodyB.position.vsub(bodyA.position,normal.ni);
        normal.ni.normalize();
        */
       normal.ni.set(1,0,0);
       t1.ni.set(0,1,0);
       t2.ni.set(0,0,1);
        bodyA.quaternion.vmult(pivotA,normal.ri);
        bodyB.quaternion.vmult(pivotB,normal.rj);

        //normal.ni.tangents(t1.ni,t2.ni);
        normal.ri.copy(t1.ri);
        normal.rj.copy(t1.rj);
        normal.ri.copy(t2.ri);
        normal.rj.copy(t2.rj);

        // update rotational constraints
        bodyA.quaternion.vmult(axisA_x_pivotA, r1.ni);
        bodyB.quaternion.vmult(axisB,          r1.nj);
        bodyA.quaternion.vmult(axisA_x_axisA_x_pivotA,  r2.ni);
        bodyB.quaternion.vmult(axisB,           r2.nj);

        if(motorEnabled){
            bodyA.quaternion.vmult(axisA,eqs.motor.axisA);
            bodyB.quaternion.vmult(axisB,eqs.motor.axisB);
            eqs.motor.targetVelocity = that.motorTargetVelocity;
            eqs.motor.maxForce = that.motorMaxForce;
            eqs.motor.minForce = that.motorMinForce;
        }
    };
};