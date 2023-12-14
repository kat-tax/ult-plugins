import {useState, useEffect} from 'preact/hooks';
import {on} from '@create-figma-plugin/utilities';
import * as $ from 'interface/store';

import type {EventComponentBuild} from 'types/events';
import type {ComponentBuild} from 'types/component';

const initial: ComponentBuild = {
  loaded: 0,
  total: 0,
  index: '',
  pages: [],
  links: {},
  roster: {},
  assets: {},
  assetMap: {},
  icons: [],
};

export function useBuild(): ComponentBuild {
  const [build, setBuild] = useState<ComponentBuild>(initial);
  
  useEffect(() => on<EventComponentBuild>('COMPONENT_BUILD', (newBuild, component) => {
    setBuild(newBuild);
    console.log('[build]', component.name, newBuild);
    $.doc.transact(() => {
      $.setProjectIndex(newBuild.index);
      $.setProjectFiles(Object.keys(newBuild.roster));
      $.setComponentCode(component.name, component.code);
      $.setComponentIndex(component.name, component.index);
      $.setComponentStory(component.name, component.story);
      Object.values(build.assets).forEach(asset =>
        $.assets.set(`${asset.name}.${asset.isVector ? 'svg' : 'png'}`, asset.bytes));
      $.components.set(component.name, {
        id: component.id,
        page: component.page,
        name: component.name,
        props: component.props,
        width: component.width,
        height: component.height,
      });
    });
    // console.log('[build]', component.name, newBuild);
  }), []);

  return build;
}
