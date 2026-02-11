### Install

```bash
> npm install vue-shared-components
```

### Usage

## Share component to other microapps/pages
main.js
```
import SharedComponents from 'vue-shared-components'

SharedComponents.register(import('path/to/component/vue/file'), { name: 'sharedComponentName' })
```

| If you used some plugins in your shared component (like vue router)
main.js
```
import SharedComponents from 'vue-shared-components'
import { createRouter, createWebHashHistory } from 'vue-router'

SharedComponents.hooks((app) => {
	app.use(createRouter({
		history: createWebHashHistory()
	}))
})

SharedComponents.register(import('path/to/component/vue/file'), { name: 'sharedComponentName' })
```

## Usage shared component from other microapps/pages
view.vue
```
<template>
	<shared-component></shared-component>
</template>

<script setup>
	import SharedComponents from 'vue-shared-components'

	const SharedComponent = SharedComponents.get('sharedComponentName').component
</script>
```