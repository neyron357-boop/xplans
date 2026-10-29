import { useRoute } from './lib/router';
import { useStore } from './store/store';
import { GrowthScreen } from './screens/Growth';
import { LowFlow } from './screens/Low';
import { MeScreen } from './screens/Me';
import { MemoryScreen } from './screens/Memory';
import { RootsScreen } from './screens/Roots';
import { SwitchFlow } from './screens/Switch';
import { Today } from './screens/Today';
import { WhatIfFlow } from './screens/WhatIf';
import { Nav } from './ui/Nav';
import { Sky } from './ui/Sky';

const ORDER = { today: 0, roots: 1, growth: 2, memory: 3, me: 4 } as const;
let lastTab = 0;

export function App() {
  useStore();
  const route = useRoute();

  // Flows take the whole screen, without the tab bar, and rise from below.
  if (route.name === 'switch' || route.name === 'whatif' || route.name === 'low') {
    return (
      <>
        <Sky />
        <div class="app">
          <div class="view view--flow" key={route.name}>
            {route.name === 'switch' && <SwitchFlow key={route.lineId} lineId={route.lineId} />}
            {route.name === 'whatif' && (
              <WhatIfFlow key={`${route.parentId}-${route.riskId}`} parentId={route.parentId} riskId={route.riskId} activate={route.activate} />
            )}
            {route.name === 'low' && <LowFlow />}
          </div>
        </div>
      </>
    );
  }

  // Tabs slide in from the side they sit on.
  const i = ORDER[route.name];
  const dir = i >= lastTab ? 1 : -1;
  lastTab = i;

  return (
    <>
      <Sky />
      <div class="app">
        <div class="view" key={route.name} style={{ '--dir': String(dir) }}>
          {route.name === 'today' && <Today />}
          {route.name === 'roots' && <RootsScreen tab={route.tab} />}
          {route.name === 'growth' && <GrowthScreen tab={route.tab} />}
          {route.name === 'memory' && <MemoryScreen />}
          {route.name === 'me' && <MeScreen tab={route.tab} />}
        </div>
        <Nav active={route.name} />
      </div>
    </>
  );
}
