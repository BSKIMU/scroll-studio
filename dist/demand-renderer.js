// One pending frame; controls' damping and animation may request continuation.
export class DemandRenderer{
 constructor(render,request=callback=>requestAnimationFrame(callback),cancel=id=>cancelAnimationFrame(id)){this.render=render;this.schedule=request;this.cancel=cancel;this.active=false;this.frame=null;}
 request(){if(!this.active||this.frame!==null)return;this.frame=this.schedule(time=>{this.frame=null;if(this.active&&this.render(time))this.request();});}
 setActive(active){this.active=active;if(!active&&this.frame!==null){this.cancel(this.frame);this.frame=null;}}
}
