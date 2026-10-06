'use strict';

const SYMBOLS = ['1', '2', '3', '4', '5', '6', 'win'];

const isPhone = window.innerWidth <= 991;

const pendingTimeouts = [];

class SoundManager {
	constructor() {
		this.spin = new Audio('./assets/sounds/spin.mp3');
		this.win = new Audio('./assets/sounds/win.mp3');

		this.spin.preload = 'auto';
		this.win.preload = 'auto';

		this.spin.loop = true;

		this.spin.load();
		this.win.load();
	}

	playSpin() {
		this.stop();

		this.spin.currentTime = 0;

		void this.spin.play().catch(() => {});
	}

	playWin() {
		this.stop();

		this.win.currentTime = 0;

		void this.win.play().catch(() => {});
	}

	stop() {
		this.spin.pause();
		this.win.pause();
	}
}

const sounds = new SoundManager();

function createSymbol(name = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]) {
	const image = new Image();

	image.src = `./assets/symbols/${name}.webp`;
	image.className = `icon-${name}`;
	image.alt = '';
	image.width = 201;
	image.height = 202;

	return image;
}

class Reel {
	constructor(reelContainer, index) {
		this.index = index;
		this.symbolContainer = reelContainer.querySelector('.icons');
		this.offset = 0;
		this.animation = null;
	}

	get factor() {
		return 1 + Math.pow(this.index / 2, 2);
	}

	appendSpinStrip(targetSymbols) {
		const fragment = document.createDocumentFragment();

		const symbolCount = 10 * Math.floor(this.factor);

		for (let index = 0; index < symbolCount; index += 1) {
			const targetIndex = index - (symbolCount - 3);

			fragment.appendChild(createSymbol(targetIndex >= 0 ? targetSymbols[targetIndex] : undefined));
		}

		this.symbolContainer.appendChild(fragment);

		return symbolCount;
	}

	async spin(targetSymbols) {
		const symbolCount = this.appendSpinStrip(targetSymbols);

		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

		const images = this.symbolContainer.querySelectorAll('img');

		const symbolHeight = Math.abs(images[1].getBoundingClientRect().top - images[0].getBoundingClientRect().top);

		const startOffset = this.offset;

		this.offset += symbolCount * symbolHeight;

		const durations = isPhone ? [1900, 2400, 3100] : [3200, 3700, 4400, 5300, 6500];

		this.animation = this.symbolContainer.animate(
			[
				{
					transform: `translateY(-${startOffset}px)`,
					filter: 'blur(0)',
				},
				{
					filter: 'blur(2px)',
					offset: 0.5,
				},
				{
					transform: `translateY(-${this.offset}px)`,
					filter: 'blur(0)',
				},
			],
			{
				duration: durations[this.index],
				easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
				fill: 'forwards',
			},
		);

		await this.animation.finished;

		this.symbolContainer.style.transform = `translateY(-${this.offset}px)`;

		this.animation.cancel();
	}
}

class Slot {
	constructor(container) {
		this.container = container;
		this.spinCount = Number(container.dataset.spin) || 1;
		this.count = 0;
		this.spinButton = document.getElementById('go-btn');

		this.reels = Array.from(container.querySelectorAll('[data-js="reel"]')).map(
			(reelElement, index) => new Reel(reelElement, index),
		);

		this.spinButton?.addEventListener('click', () => this.spin());
	}

	async spin() {
		if (!this.spinButton || this.spinButton.disabled) return;

		this.count += 1;

		const isWinningSpin = this.count === this.spinCount;

		const targetSymbols = this.reels.map(() =>
			isWinningSpin
				? [SYMBOLS[Math.floor(Math.random() * 6)], 'win', SYMBOLS[Math.floor(Math.random() * 6)]]
				: [createRandomSymbol(), createRandomSymbol(), createRandomSymbol()],
		);

		this.container.classList.remove('is--winner');

		this.spinButton.disabled = true;

		sounds.playSpin();

		try {
			await Promise.all(
				this.reels.map(async (reel, index) => {
					await new Promise((resolve) => setTimeout(resolve, index * 250));

					return reel.spin(targetSymbols[index]);
				}),
			);
		} catch (error) {
			if (error?.name !== 'AbortError') throw error;
		}

		sounds.stop();

		if (!isWinningSpin) {
			this.spinButton.disabled = false;

			return;
		}

		this.container.classList.add('is--winner');

		sounds.playWin();

		pendingTimeouts.push(setTimeout(() => this.openWinModal(), 1200));
	}

	openWinModal() {
		const effects = document.getElementById('effects');

		if (effects) {
			const effectBlock = document.createElement('div');

			effectBlock.style.backgroundImage = 'url("./assets/images/desctop_fire_shockwave.gif")';

			effectBlock.className = 'effects__block';

			effects.appendChild(effectBlock);

			effects.classList.replace('hidden', 'visible');

			pendingTimeouts.push(setTimeout(() => effects.classList.replace('visible', 'hidden'), 1500));
		}

		document.body.classList.add('is--modal-open');

		document.getElementById('modal')?.classList.add('is--active');
	}
}

function createRandomSymbol() {
	return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function calculateButtonScale(button, options = { min: 0.5, max: 1, step: 0.07 }) {
	if (!button) return;

	button.parentElement.style.transform = '';

	button.classList.remove('pulse');

	const overflowRatio = button.getBoundingClientRect().width / window.innerWidth - 1;

	if (overflowRatio <= 0) {
		button.classList.add('pulse');

		button.style.transform = `scale(${options.max})`;

		return;
	}

	button.parentElement.style.transform = `scale(${Math.max(
		options.max - overflowRatio * options.step * 10,
		options.min,
	)})`;

	button.classList.add('pulse');
}

function initSlot() {
	new Slot(document.getElementById('slot'));

	calculateButtonScale(document.getElementById('go-btn'));

	calculateButtonScale(document.getElementById('win-button-modal'));
}

function initLoader() {
	const loader = document.getElementById('loader');

	if (!loader) return;

	pendingTimeouts.push(
		setTimeout(() => {
			loader.classList.add('is--hidden');

			loader.setAttribute('aria-hidden', 'true');
		}, 2500),
	);
}

if (document.readyState === 'loading') {
	document.addEventListener(
		'DOMContentLoaded',
		() => {
			initLoader();
			initSlot();
		},
		{ once: true },
	);
} else {
	initLoader();
	initSlot();
}
