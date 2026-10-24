import {shapeTools} from './shape-tools.js?v=20261025-release1';

export const brushTools=['draw','brush','airbrush','erase'];
export const paintTools=[...brushTools,...shapeTools,'lasso','lassofill','fill'];
export const pageCanvasTools=[...paintTools,'text','balloon','eyedropper','select'];
