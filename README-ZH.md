### 安装

```bash
> npm install vue-shared-components
```

### 使用

## 向其他应用/页面共享组件
main.js
```
import SharedComponents from 'vue-shared-components'

SharedComponents.register(import('path/to/component/vue/file'), { name: 'sharedComponentName' })
```

| 如果组件使用了vue的其他插件，如路由
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

## 使用其他应用/页面共享的组件
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