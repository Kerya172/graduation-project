const video = document.querySelector('.video-beckground');

const swiperText = new Swiper('.swiper',{
    speed:1600,
    mousewheel:{ },
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
    navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev"
    }
})
swiperText.on('slideChange',function(){
    gsap.to(video,1.6,{
        currentTime:(video.duration/ this.slides.length ) * this.realIndex
    })

})

function show(state, formType = 'register') {
    if (formType === 'register') {
        document.getElementById('modalForm').style.display = state;
        document.getElementById('filter').style.display = state;
    } else if (formType === 'login') {
        document.getElementById('modalForm2').style.display = state;
        document.getElementById('filterEntry').style.display = state;
    }
}



function selectPlan(element) {
    // Снимаем выделение со всех
    document.querySelectorAll('.plan').forEach(plan => {
        plan.classList.remove('selected');
    });
    // Выделяем текущий
    element.classList.add('selected');
}

