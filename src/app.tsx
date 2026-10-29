import { useRoute } from './lib/router';
import { useStore } from './store/store';
import { LowFlow } from './screens/Low';
import { MemoryScreen } from './screens/Memory';
import { RootsScreen } from './screens/Roots';
import { SwitchFlow } from './screens/Switch';
import { Today } from './screens/Today';
import { WhatIfFlow } from './screens/WhatIf';
import { Nav } from './ui/Nav';

export function App() {
  useStore();
  const route = useRoute();

  // Flows take the whole screen, without the tab bar.
  if (route.name === 'switch') return <div class="app"><SwitchFlow key={route.lineId} lineId={route.lineId} /></div>;
  if (route.name === 'whatif') {
    return (
      <div class="app">
        <WhatIfFlow key={`${route.parentId}-${route.riskId}`} parentId={route.parentId} riskId={route.riskId} activate={route.activate} />
      </div>
    );
  }
  if (route.name === 'low') return <div class="app"><LowFlow /></div>;

  return (
    <div class="app">
      {route.name === 'today' && <Today />}
      {route.name === 'roots' && <RootsScreen tab={route.tab} />}
      {route.name === 'memory' && <MemoryScreen />}
      <Nav active={route.name} />
    </div>
  );
}
