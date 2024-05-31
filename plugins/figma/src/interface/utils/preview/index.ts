import {bundle} from 'syn-bundler';
import {notify} from 'interface/telemetry';
import * as $ from 'interface/store';

import importMap from './importMap.json';
import iframe from './templates/iframe.html.tpl';
import loader from './templates/loader.tsx.tpl';
import app from './templates/app.tsx.tpl';

import type {UserSettings} from 'types/settings';
import type {ComponentBuild} from 'types/component';

const ENTRY_POINT = '/index.tsx';

interface PreviewOptions {
  tag: string,
  name: string,
  path: string,
  props: string,
  theme: string,
  language: string,
  settings: UserSettings,
  build: ComponentBuild,
}

export async function preview(options: PreviewOptions) {
  const {tag, name, path, props, theme, language, settings, build} = options;

  // Virtual filesystem
  const files: Map<string, string | Uint8Array> = new Map();

  // Add components to filesystem
  for (const [key, component] of Object.entries(build.roster)) {
    try {
      const contents = $.getComponentCode(key);
      const code = contents.toString();
      files.set(component.path, code);
      if (name === component.name) {
        console.debug('[preview]', tag);
      }
    } catch (e) {
      notify(e, `Failed to build preview component: ${component}`);
      console.error('[preview]', e.toString());
    }
  }

  // Add assets to filesystem
  for (const asset of Object.values(build.assets)) {
    try {
      const ext = asset.isVector ? 'svg' : 'png';
      const folder = asset.isVector ? 'svg' : 'img';
      const path = `/assets/${folder}/${asset.name.toLowerCase()}.${ext}`;
      files.set(path, asset.bytes);
    } catch (e) {
      notify(e, `Failed to build preview asset: ${asset.name}`);
      console.error('[preview]', e.toString());
    }
  }

  // Build preview app
  const previewApp = atob(app.toString());
  console.log('PROPS', previewApp, props);
  try {
    files.set('/theme', $.getProjectTheme().toString());
    files.set(ENTRY_POINT, previewApp
      .replace('__CURRENT_THEME__', theme)
      .replace('__CURRENT_LANGUAGE__', language)
      .replace('__COMPONENT_DEF__', getImports(name, path, props))
      .replace('__COMPONENT_REF__', tag));
    return await bundle(ENTRY_POINT, files, settings.esbuild, importMap);
  } catch (e) {
    notify(e, 'Failed to build preview app');
    console.error('[preview/app]', e.toString());
  }
}

export async function init(settings: UserSettings) {
  // Build filesystem
  const files = new Map<string, string>();
  files.set(ENTRY_POINT, atob(loader.toString()));
  
  // Build preview loader
  try {
    const output = await bundle(ENTRY_POINT, files, settings.esbuild, importMap);
    return atob(iframe)
      .replace('__IMPORT_MAP__', JSON.stringify(importMap, undefined, 2))
      .replace('__LOADER__', output);
  } catch(e) {
    notify(e, 'Failed to build preview loader');
  }
}

// TODO: this regex matching is flaky, make the generator provide
// the main component import path as well as any prop imports
function getImports(name: string, path: string, props: string) {
  const regex = /<\s*([a-zA-Z][^\s>\/]*)[^>]*>/g;
  const swaps = Array
    .from(props.matchAll(regex), match => match[1])
    .filter(swap => swap !== 'Icon');
  const imports = [
    `import {${name}} from '${path}';`,
    ...swaps?.map(swap => `import {${swap}} from 'components/${swap}';`),
  ];
  console.log('Parsed Imports:', imports);
  return imports.join('\n');
}
