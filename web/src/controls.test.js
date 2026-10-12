import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import NativeWorkflowStudio from './NativeWorkflowStudio';
import config from './nativeWorkflowConfig.json';
import NativeAIReport from './components/NativeAIReport';

global.IS_REACT_ACT_ENVIRONMENT = true;

let element, root;
beforeEach(() => { element=document.createElement('div');document.body.appendChild(element);root=createRoot(element);localStorage.clear(); });
afterEach(async () => { await act(async()=>root.unmount());element.remove();jest.restoreAllMocks(); });
const click=async button=>act(async()=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));

it('demo credentials fill without login submit', async()=>{
  const paths=[];
  global.fetch=jest.fn(async path=>{paths.push(path);if(path.endsWith('/api/health'))return{ok:true,json:async()=>({})};if(path.endsWith('/api/auth/demo-credentials'))return{ok:true,json:async()=>({email:'fixture@example.test',password:'fixture-only'})};throw Error('unexpected fetch');});
  await act(async()=>root.render(<App/>));
  await click([...element.querySelectorAll('button')].find(x=>x.textContent==='Fill demo credentials'));
  expect(element.querySelector('input[type=email]').value).toBeTruthy();
  expect(element.querySelector('input[type=password]').value).toBeTruthy();
  expect(paths.some(path=>path.endsWith('/api/auth/login'))).toBe(false);
});

it('presets fill native required and optional fields without generation',async()=>{
 const calls=[];const request=jest.fn(async path=>{calls.push(path);if(path==='/api/suppliers')return[{id:17,name:'Fixture supplier'}];if(path==='/api/ai/history')return{history:[]};throw Error('generation invoked');});
 await act(async()=>root.render(<NativeWorkflowStudio config={config} request={request}/>));
 await click([...element.querySelectorAll('nav button')].find(x=>x.textContent==='Risk adjusted pricing'));
 await click([...element.querySelectorAll('.native-ai-control-buttons button')].find(x=>x.textContent==='Quick brief'));
 const fields=[...element.querySelectorAll('form .native-workflow-fields input,form .native-workflow-fields textarea,form .native-workflow-fields select')];
 expect(fields).toHaveLength(4);expect(fields[0].value).toBe('17');fields.slice(1).forEach(x=>expect(x.value).toBeTruthy());
 expect(calls.every(x=>x==='/api/suppliers'||x==='/api/ai/history')).toBe(true);
});

it('saved report renders structured JSON including falsy scalars',async()=>{
 const request=jest.fn(async path=>path==='/api/suppliers'?[]:{history:[{id:1,endpoint:'/api/ai/risk-adjusted-pricing',created_at:'2026-01-01T00:00:00Z',result_text:JSON.stringify({approved:false,score:0,note:'',factors:[{name:'Delivery',risk:0}]}),model_used:'fixture-model'}]});
 await act(async()=>root.render(<NativeWorkflowStudio config={config} request={request}/>));
 await click([...element.querySelectorAll('button')].find(x=>x.textContent==='Open report'));
 const report=element.querySelector('.ai-report');
 expect(report.textContent).toContain('Approved');expect(report.textContent).toContain('No');expect(report.textContent).toContain('Score');expect(report.textContent).toContain('0');expect(report.textContent).toContain('""');expect(report.querySelector('table')).not.toBeNull();expect(report.querySelector('pre')).toBeNull();
});

it('all three presets cover every native tool and show missing genuine prerequisites',async()=>{
 const request=jest.fn(async path=>path==='/api/suppliers'?[{id:17,name:'Fixture supplier'}]:{history:[]});
 await act(async()=>root.render(<NativeWorkflowStudio config={config} request={request}/>));
 for(const feature of config.features){
   await click([...element.querySelectorAll('nav button')].find(x=>x.textContent===feature.title));
   for(const name of ['Quick brief','Team planning','Detailed review']){
     await click([...element.querySelectorAll('.native-ai-control-buttons button')].find(x=>x.textContent===name));
     for(const field of feature.fields){
       const control=element.querySelector(`[id="native-workflow-${field.key}"]`);
       if(field.manual&&!field.resource){expect(element.querySelector('.native-ai-controls [role=status]').textContent).toContain(field.label);continue;}
       expect(control.value).not.toBe('');
       if(field.resource)expect(control.value).toBe('17');
     }
   }
 }
 expect(request.mock.calls.every(([path])=>path==='/api/suppliers'||path==='/api/ai/history')).toBe(true);
});


it('returned AI JSON renders labeled sections, lists, and scalar values',async()=>{
 await act(async()=>root.render(<NativeAIReport response={{analysis:{summary:'Fixture analysis',approved:false,score:0,note:'',actions:['Review source','Escalate risk']}}} title="Fixture report"/>));
 const report=element.querySelector('.ai-report');
 expect(report.textContent).toContain('Summary');expect(report.textContent).toContain('Fixture analysis');expect(report.textContent).toContain('No');expect(report.textContent).toContain('0');expect(report.textContent).toContain('""');expect(report.querySelectorAll('li')).toHaveLength(2);expect(report.querySelector('pre')).toBeNull();
});

it('network preset uses actual loaded alternate supplier names',async()=>{
 const request=jest.fn(async path=>path==='/api/suppliers'?[{id:17,name:'Primary fixture'},{id:23,name:'Alternate fixture'}]:{history:[]});
 await act(async()=>root.render(<NativeWorkflowStudio config={config} request={request}/>));
 await click([...element.querySelectorAll('nav button')].find(x=>x.textContent==='Network risk'));
 await click([...element.querySelectorAll('.native-ai-control-buttons button')].find(x=>x.textContent==='Quick brief'));
 expect(element.querySelector('#native-workflow-supplier_id').value).toBe('17');
 expect(JSON.parse(element.querySelector('#native-workflow-alternate_suppliers').value)).toEqual(['Alternate fixture']);
});

it('renders all 16 project seed suppliers from a paginated API payload without a runtime error', async()=>{
  // Names come from backend/src/seed.js; IDs are fixture references, not submitted to the API.
  const names=['TechNova Solutions','Shanghai MegaSteel','Bangalore InfoTech','Munich AutoParts GmbH','São Paulo Chemicals','Lagos Logistics Ltd','Tokyo Electronics Co','Moscow Energy Corp','Seoul Semiconductor','Istanbul Textiles','Sydney Mining Group','Nairobi AgriTech','Warsaw Pharma','Dubai Trade Hub','Vancouver Green Energy','Bangkok Components'];
  const request=jest.fn(async path=>path==='/api/suppliers'?{data:names.map((name,index)=>({id:index+1,name})),pagination:{total:16,page:1}}:{history:[]});
  const consoleError=jest.spyOn(console,'error').mockImplementation(()=>{});
  await act(async()=>root.render(<NativeWorkflowStudio config={config} request={request}/>));
  const rows=element.querySelectorAll('.native-workflow-records article tbody tr');
  expect(rows).toHaveLength(16);
  expect(rows[0].textContent).toContain('TechNova Solutions');
  expect(rows[15].textContent).toContain('Bangkok Components');
  expect(consoleError).not.toHaveBeenCalled();
});

it('reports malformed record and history payloads without calling array methods on objects', async()=>{
  const request=jest.fn(async path=>path==='/api/suppliers'?{data:{unexpected:true}}:{history:{unexpected:true}});
  const consoleError=jest.spyOn(console,'error').mockImplementation(()=>{});
  await act(async()=>root.render(<NativeWorkflowStudio config={config} request={request}/>));
  expect(element.textContent).toContain('The API did not return a record array.');
  expect(element.querySelectorAll('.native-workflow-records tbody tr')).toHaveLength(0);
  expect(consoleError).not.toHaveBeenCalled();
});
