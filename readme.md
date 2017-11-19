�ص�˵����notice���������� ������Ӣ��;������������������Կɶ�������Ϊ��
<br>
### 1. setup
<pre>npm i --save-dev react-dynamic-router-loader</pre>
### 2. using
<pre>
    // webpack.config.js
    ...
    loader: "react-dynamic-router-loader",
    options: {
        <font color="#258125">// Loading Component</font>
        asyncDefaultComponent: './components/loading.jsx'
    }
    ...
</pre>
<pre>
    // ./components/loading.jsx
    import React from 'react';

    const _AsyncComponent = (loaderComponent, callback) => (
        class _AsyncComponent extends React.Component {
            state = {
                Component: null
            }

            async componentWillMount() {
                let Component = await loaderComponent();

                this.setState({
                    Component
                });
            }

            render() {
                const { Component } = this.state;

                return (Component) ? 
                            &lt;Component {...this.props} /&gt; : 
                            callback();
            }
        }
    );

    <font color="#258125">// Currently only to do so</font>
    module.exports = _AsyncComponent;

</pre>
<pre>
    // Reactjs Code
    ...
    <font color="#a61c00">&lt;MyComponent</font> <font color="red">component={require(
                                /* webpackChunkName: "index" */
                                'path/my-component.jsx')}</font> <font color="#a61c00">/&gt</font>;
    ...
    <font color="#258125">// webpackChunkName
    // the "import" feature of the CommonJS API for webpack2</font>
    
    // Reactjs Code 2
    <font color="#6fa8dc">class</font> <font color="#a61c00">MyComponent</font> <font color="#4a86e8">extends</font> <font color="#1c4587">React.Component</font>{
        preRender(){
            <font color="#258125">
            // Don't use props. 
            // because this.props not equal MyComponent's props</font>

            return (
                <font color="#a61c00">&lt;div&gt;</font>My Loading View<font color="#a61c00">&lt;/div&gt</font>;
            );
        }
    }
</pre>
### 3. Webpack.config.js info
<pre>
    // webpack config must has client and server config

    let clientConfig = {
        ...
        // client config
        ...
    };

    let serverConfig = {
        ...
        // server config
        ...
    };

    module/exports = [serverConfig, clientConfig]
</pre>
����Ϊ���ļ���˵����
ֻ��������Ӧ���� �������Ⱦ �� �ͻ�����Ⱦ ��ͬʱ���ͻ�����Ⱦ ��һ�����ϣ�ϣ������ͨ��Webpack2��import��ʵ�� Code Splitting��������룩�� ��Ŀǰ����һ�����⡣
<br/>
���ǻ������� <font color="red">Warning: XXX did not match. Server</font>����������������˼·����Ҳ���Ǵ���һ������ġ�
<br/>
�д��Ľ���Hope to improve��