import './App.css';
import { TVChartContainer } from './components/TVChartContainer/index';
import { version } from './charting_library';

const App = () => {
	return (
		<div className={'App'}>
			<small>{version()}</small>
			<TVChartContainer />
		</div>
	);
}

export default App;
