// Display labels are separate from the source names used for motion matching.
const labels = Object.fromEntries(`
acknowledging|알아들었다고 고개 끄덕이기
angry gesture|화내며 손짓하기
annoyed head shake|짜증 내며 고개 젓기
being cocky|거만하게 으스대기
dismissing gesture|손을 내저으며 거절하기
happy hand gesture|기뻐하며 손짓하기
hard head nod|힘주어 고개 끄덕이기
head nod yes|동의하며 고개 끄덕이기
lengthy head nod|천천히 고개 끄덕이기
look away gesture|고개 돌려 외면하기
relieved sigh|안도의 한숨 쉬기
sarcastic head nod|비꼬듯 고개 끄덕이기
shaking head no|고개 저어 부정하기
thoughtful head shake|생각하며 고개 갸웃하기
armada|회전 뒤돌려차기
armada to esquiva|회전차기 후 몸 낮춰 피하기
au|옆으로 손짚고 돌기
au to role|옆돌기 후 낮게 몸 돌리기
bencao|밀어차기
capoeira|카포에라 연속 동작
chapa|옆으로 밀어차기
chapa giratoria|회전 옆차기
chapa-giratoria|회전 옆차기
chapaeu de couro|손짚고 회전차기
esquiva|몸 낮춰 피하기
ginga backward|뒤로 물러나며 기본 스텝
ginga forward|앞으로 나아가며 기본 스텝
ginga sideways|옆으로 기본 스텝
ginga sideways to au|옆 스텝 후 손짚고 돌기
ginga variation|변형 기본 스텝
macaco side|옆으로 손짚고 뒤집기
martelo|돌려차기
martelo do chau|바닥에서 돌려차기
martelo do chau sem mao|손을 짚지 않고 낮게 돌려차기
meia lua de compasso|손짚고 뒤돌려차기
meia lua de compasso back|뒤로 돌아 손짚고 차기
meia lua de frente|앞으로 반달차기
pontera|앞차기
queshada|바깥쪽 반달차기
rasteira|다리 걸어 넘어뜨리기
troca|발 바꿔 딛기
cow milking|젖소 젖 짜기
dig and plant seeds|땅 파고 씨앗 심기
pick fruit|열매 따기
plant a plant|모종 심기
plant tree|나무 심기
pull plant|작물 뽑기
watering|물 주기
box idle|상자 들고 서 있기
box turn|상자 들고 돌아서기
box walk arc|상자 들고 곡선으로 걷기
holding idle|물건 들고 서 있기
holding turn left|물건 들고 왼쪽으로 돌기
holding turn right|물건 들고 오른쪽으로 돌기
holding walk|물건 들고 걷기
wheelbarrow dump|외바퀴 수레 비우기
wheelbarrow idle|외바퀴 수레 잡고 서 있기
wheelbarrow walk|외바퀴 수레 밀기
wheelbarrow walk turn|수레 밀며 방향 바꾸기
ascending stairs|계단 오르기
walking up the stairs|계단 걸어 오르기
running up stairs|계단 뛰어 오르기
female sitting pose|여성 앉은 자세
female sitting pose2|여성 앉은 자세 2
male sitting pose|남성 앉은 자세
sitting|앉기
laying breathless|누워서 가쁘게 숨쉬기
open door outwards|문 밀어 열기
opening door inwards|문 당겨 열기
cover to stand|엄폐에서 일어서기
stand to cover|엄폐 자세로 낮추기
crouch idle|웅크려 대기하기
idle crouching|웅크려 대기하기
crouch to standing idle|웅크린 자세에서 일어서기
crouched sneaking left|몸 낮춰 왼쪽으로 살금살금 걷기
crouched sneaking right|몸 낮춰 오른쪽으로 살금살금 걷기
crouching turn 90 left|웅크려 왼쪽으로 90도 돌기
crouching turn 90 right|웅크려 오른쪽으로 90도 돌기
left cover sneak|엄폐하며 왼쪽으로 이동하기
right cover sneak|엄폐하며 오른쪽으로 이동하기
death crouching headshot front|웅크린 채 머리에 맞아 쓰러지기
death from back headshot|뒤에서 머리에 맞아 쓰러지기
death from front headshot|앞에서 머리에 맞아 쓰러지기
death from right|오른쪽에서 맞아 쓰러지기
death from the back|뒤에서 맞아 쓰러지기
death from the front|앞에서 맞아 쓰러지기
falling idle|공중에서 떨어지기
falling to roll|떨어진 뒤 구르기
hard landing|강하게 착지하기
hit reaction|공격에 맞고 휘청이기
idle|편하게 서 있기
idle aiming|조준하며 대기하기
idle crouching aiming|웅크려 조준하기
kneeling idle|무릎 꿇고 대기하기
weight shift|체중 옮기며 서 있기
firing rifle|소총 사격
rifle aiming idle|소총 조준 대기
rifle jump|소총 들고 점프하기
rifle run|소총 들고 달리기
reloading|탄창 재장전
toss grenade|수류탄 던지기
jump|점프하기
jump down|아래로 뛰어내리기
jump loop|연속 점프하기
jump up|위로 뛰어오르기
jumping up|제자리에서 뛰어오르기
running|달리기
walking|걷기
walking backwards|뒤로 걷기
run backwards|뒤로 달리기
standard run|기본 달리기
run to stop|달리다가 멈추기
left strafe|왼쪽으로 옆걸음
right strafe|오른쪽으로 옆걸음
left strafe walk|왼쪽으로 옆걸음 걷기
right strafe walk|오른쪽으로 옆걸음 걷기
left strafe walking|왼쪽으로 옆걸음 걷기
right strafe walking|오른쪽으로 옆걸음 걷기
strafe left|왼쪽으로 옆걸음
strafe right|오른쪽으로 옆걸음
left turn|왼쪽으로 돌기
right turn|오른쪽으로 돌기
left turn 90|왼쪽으로 90도 돌기
right turn 90|오른쪽으로 90도 돌기
turn 90 left|왼쪽으로 90도 돌기
turn 90 right|오른쪽으로 90도 돌기
turn left|왼쪽으로 돌기
turning right 45 degrees|오른쪽으로 45도 돌기
draw a great sword|대검 뽑기
sheath sword|검집에 검 넣기
spell cast|주문 시전하기
standing block idle|방어 자세 유지하기
standing block react large|큰 공격을 막고 버티기
standing disarm over shoulder|어깨 너머로 무기 집어넣기
standing disarm underarm|옆구리에 무기 집어넣기
standing idle|무기 들고 대기하기
standing idle looking|무기 들고 주위 살피기
standing jump|무기 들고 점프하기
standing melee attack 360 high|높게 회전 베기
standing melee attack 360 low|낮게 회전 베기
standing melee attack backhand|역방향 베기
standing melee attack downward|위에서 내려찍기
standing melee attack horizontal|가로로 휘두르기
standing melee attack kick|무기 들고 발차기
standing melee combo attack|연속 근접 공격
standing melee run jump attack|달려들며 점프 공격
standing react large from left|왼쪽에서 크게 맞고 휘청이기
standing react large from right|오른쪽에서 크게 맞고 휘청이기
standing react large gut|복부를 맞고 움츠리기
standing taunt battlecry|함성 지르며 도발하기
standing taunt chest thump|가슴 치며 도발하기
unarmed equip over shoulder|어깨 너머로 무기 꺼내기
unarmed equip underarm|옆구리에서 무기 꺼내기
unarmed idle|맨손으로 대기하기
unarmed idle looking|맨손으로 주위 살피기
unarmed jump|맨손으로 점프하기
unarmed jump running|맨손으로 달리며 점프하기
a person stands in a ready stance holding an imaginary sword with both|양손 검술 준비 자세
`.trim().split('\n').map(line=>line.split('|')));
const weaponActions={
 '180 turn':'들고 뒤돌기',attack:'공격',blocking:'막기',block:'막기','block idle':'방어 대기',casting:'들고 주문 시전',crouching:'들고 몸 낮추기',crouch:'들고 웅크리기','crouch block':'웅크려 막기','crouch block idle':'웅크려 방어 대기','crouch idle':'웅크려 대기',
 'high spin attack':'높게 회전 베기',idle:'준비 자세',impact:'들고 피격 반응',jump:'들고 점프','jump attack':'점프 공격',kick:'들고 발차기','power up':'기 모으기',run:'들고 달리기',slash:'베기','slide attack':'미끄러지며 베기',strafe:'들고 옆걸음',turn:'들고 방향 바꾸기',walk:'들고 걷기',death:'들고 쓰러지기'
};
const directions={backward:'뒤로',back:'뒤로',forward:'앞으로',left:'왼쪽으로',right:'오른쪽으로','backward left':'왼쪽 뒤로','backward right':'오른쪽 뒤로','forward left':'왼쪽 앞으로','forward right':'오른쪽 앞으로'};
export function motionLabel(entry){
 const raw=typeof entry==='string'?entry:entry?.name||'';
 if(/[가-힣]/.test(raw))return raw.replace(/^(Mixamo|Kimodo)\s*·\s*/i,'');
 let name=raw.toLowerCase().trim(),suffix='';const variation=name.match(/(?:\s*\((\d+)\)|\s+(?:ver\.\s*)?(\d+))$/);
 if(variation&&!/turn (left|right) 90$/.test(name)){suffix=' '+(variation[1]||variation[2]);name=name.slice(0,variation.index);}
 let label=labels[name];
 if(!label)for(const [prefix,ko]of [['great sword ','대검'],['sword and shield ','검·방패'],['two handed sword ','양손 검']])if(name.startsWith(prefix)&&weaponActions[name.slice(prefix.length)])label=ko+' '+weaponActions[name.slice(prefix.length)];
 if(!label){const m=name.match(/^(?:(standing|unarmed) )?(walk crouching|walk|run|sprint) (.+)$/);if(m&&directions[m[3]])label=(m[1]==='unarmed'?'맨손으로 ':m[1]?'무기 들고 ':'')+directions[m[3]]+' '+({walk:'걷기',run:'달리기',sprint:'전력 질주','walk crouching':'몸 낮춰 걷기'}[m[2]]);}
 if(!label){const m=name.match(/^(standing|unarmed) turn (left|right) 90$/);if(m)label=(m[1]==='unarmed'?'맨손으로 ':'무기 들고 ')+(m[2]==='left'?'왼쪽':'오른쪽')+'으로 90도 돌기';}
 if(name==='strafe')label='옆걸음 이동';
 return label?label+suffix:raw;
}
