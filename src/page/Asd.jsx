import { useState, useEffect } from 'react';

export default function asd() {
    const [count, setCount] = useState(0); // count의 초기값은 0
    const [ people, setPeople ] = useState (['홍길동', '김철수', '이영희']);
    
    useEffect(() => {
        console.log('컴포넌트가 마운트 되었습니다.');
    }, [count])

    return (
        <div>
            <p>현재 숫자: {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
        </div>
    )
}