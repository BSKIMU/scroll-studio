// Original examples based on common lettering conventions; no reference artwork is copied.
export const balloonShapes=[['ellipse','타원'],['round','둥근 사각형'],['rect','사각형 · 내레이션'],['thought','생각 · 구름'],['shout','외침 · 톱니'],['wave','떨리는 선'],['rough','거친 윤곽'],['electric','전자음'],['burst','폭발'],['sparkle','반짝임'],['flash','집중선'],['text','텍스트만']];
const common={shape:'ellipse',tail:'straight',outline:'solid',lineFactor:1,font:27,weight:'500',family:'sans',fill:'#ffffff',stroke:'#22272c',ink:'#20252a',transparent:false};
const example=(id,label,hint,text,style)=>({id,label,hint,text,style:{...common,...style}});
export const balloonPresets=[
 example('conversation','일상 대화','기본 목소리의 기준으로 쓰세요.','오늘도\n같이 갈래?',{}),
 example('gentle','부드러운 대화','둥근 모서리와 완만한 꼬리.','천천히\n이야기해도 돼.',{shape:'round',tail:'curved',family:'round'}),
 example('narration','내레이션','꼬리 없이 시간·장소를 설명합니다.','그날 오후,\n비가 그쳤다.',{shape:'rect',tail:'none',family:'serif'}),
 example('thought','속마음','작은 원 꼬리를 머리 쪽으로 향하게.','혹시…\n나를 기다렸나?',{shape:'thought',tail:'circles'}),
 example('whisper','속삭임','가느다란 파선과 작은 글자.','이건 우리만의\n비밀이야.',{outline:'dashed',font:23,lineFactor:.75}),
 example('faint','힘없는 말','점선과 여백으로 약한 목소리.','조금만…\n쉬었다 가자.',{outline:'dotted',font:22,ink:'#66717a',lineFactor:.7,tail:'curved'}),
 example('tremble','떨리는 목소리','불안과 울먹임을 흔들리는 선으로.','괜찮아…\n정말 괜찮아.',{shape:'wave',tail:'curved',font:25}),
 example('monster','거친 목소리','특정 화자의 거친 목소리에 사용.','누가 감히\n나를 깨웠지?',{shape:'rough',weight:'900',family:'serif',lineFactor:1.4}),
 example('radio','전화 · 무전','규칙적인 돌기와 번개 꼬리.','들리나요?\n곧 도착합니다.',{shape:'electric',tail:'lightning',family:'mono',font:25}),
 example('emphasis','강한 강조','이중 윤곽으로 중요한 한마디.','이번에는\n내가 지킬게.',{outline:'double',weight:'700',lineFactor:1.1}),
 example('shout','외침','굵은 글자와 톱니 모양.','거기서\n멈춰!',{shape:'shout',weight:'900',font:34,lineFactor:1.45}),
 example('burst','폭발 · 놀람','불규칙한 뾰족함으로 갑작스러운 반응.','뭐라고?!',{shape:'burst',tail:'none',weight:'900',font:35,lineFactor:1.4}),
 example('hesitation','망설임','작은 말과 넓은 여백으로 머뭇거림.','저기…\n그러니까…',{font:21,tail:'curved',lineFactor:.8}),
 example('sparkle','반짝이는 말','짧은 감탄을 빛나는 윤곽에.','정말\n멋져!',{shape:'sparkle',tail:'none',weight:'700',font:30}),
 example('impact','충격 · 깨달음','집중선 안에 짧고 강한 생각.','설마…!',{shape:'flash',tail:'none',weight:'900',font:33,lineFactor:.7}),
 example('afterglow','여운 · 독백','테두리 없이 남는 짧은 생각.','다시 만날 수\n있을까.',{shape:'text',tail:'none',family:'serif',font:25,ink:'#56616d'})
];

export function presetStyle(preset,line=1.5){const {lineFactor,...style}=preset.style;return {...style,line:line*lineFactor};}

